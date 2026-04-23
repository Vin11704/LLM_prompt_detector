import asyncio
import json
import os
from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from llm import classify_prompt, evaluate_response, test_prompt
from model import EvaluateRequest, ParseResponse
from auth import router as auth_router, verify_session
from fastapi import Depends

app = FastAPI(title="LLM Security Evaluation Harness")

_default_origins = ["http://localhost:8000", "http://127.0.0.1:8000"]
_extra_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _extra_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"


@app.post("/parse", response_model=ParseResponse, dependencies=[Depends(verify_session)])
async def parse_file(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode("utf-8", errors="replace")
    prompts = [line.strip() for line in text.splitlines() if line.strip()]
    return ParseResponse(prompts=prompts, total=len(prompts))


def _build_summary(results: list[dict], total_prompts: int) -> dict:
    complied = sum(1 for r in results if r["verdict"] == "COMPLIED")
    refused = sum(1 for r in results if r["verdict"] == "REFUSED")
    partial = sum(1 for r in results if r["verdict"] == "PARTIAL")
    errors = total_prompts - len(results)
    tested = len(results)
    vuln_score = round((complied / tested * 100) if tested > 0 else 0, 1)

    by_classification: dict[str, dict] = {}
    for r in results:
        cat = r["classification"]
        if cat not in by_classification:
            by_classification[cat] = {"total": 0, "complied": 0, "refused": 0, "partial": 0}
        by_classification[cat]["total"] += 1
        verdict = r["verdict"]
        if verdict in ("COMPLIED", "REFUSED", "PARTIAL"):
            by_classification[cat][verdict.lower()] += 1

    return {
        "total": total_prompts,
        "tested": tested,
        "complied": complied,
        "refused": refused,
        "partial": partial,
        "errors": errors,
        "vulnerability_score_pct": vuln_score,
        "by_classification": by_classification,
    }


async def _evaluate_generator(prompts: list[str]):
    results: list[dict] = []

    for i, prompt in enumerate(prompts):
        # Step 1: classify
        yield f"data: {json.dumps({'index': i, 'status': 'classifying'})}\n\n"
        try:
            cls = await classify_prompt(prompt)
        except Exception as e:
            yield f"data: {json.dumps({'index': i, 'status': 'error', 'message': str(e)})}\n\n"
            await asyncio.sleep(0.5)
            continue

        # Step 2: test target
        yield f"data: {json.dumps({'index': i, 'status': 'testing'})}\n\n"
        try:
            target_response = await test_prompt(prompt)
        except Exception as e:
            yield f"data: {json.dumps({'index': i, 'status': 'error', 'message': str(e)})}\n\n"
            await asyncio.sleep(0.5)
            continue

        # Step 3: sentinel evaluation
        yield f"data: {json.dumps({'index': i, 'status': 'evaluating'})}\n\n"
        try:
            verdict = await evaluate_response(prompt, target_response)
        except Exception as e:
            yield f"data: {json.dumps({'index': i, 'status': 'error', 'message': str(e)})}\n\n"
            await asyncio.sleep(0.5)
            continue

        result = {
            "index": i + 1,
            "prompt": prompt,
            "classification": cls.get("classification", "UNKNOWN"),
            "classification_confidence": cls.get("confidence", "UNKNOWN"),
            "classification_reason": cls.get("reason", ""),
            "target_response": target_response,
            "verdict": verdict.get("verdict", "UNKNOWN"),
            "risk_level": verdict.get("risk_level", "UNKNOWN"),
            "verdict_reason": verdict.get("reason", ""),
        }
        results.append(result)
        yield f"data: {json.dumps({'index': i, 'status': 'done', 'result': result})}\n\n"

        await asyncio.sleep(0.5)

    summary = _build_summary(results, len(prompts))
    yield f"data: {json.dumps({'status': 'complete', 'summary': summary, 'results': results})}\n\n"


@app.post("/evaluate", dependencies=[Depends(verify_session)])
async def evaluate(request: EvaluateRequest):
    return StreamingResponse(
        _evaluate_generator(request.prompts),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# Serve frontend — must be mounted last so API routes take priority
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")
