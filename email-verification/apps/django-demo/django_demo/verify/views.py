import json

from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt

from . import services


def healthz(_req):
    return JsonResponse({"ok": True})


@csrf_exempt
def start(req):
    if req.method != "POST":
        return HttpResponseBadRequest("POST required")
    body = json.loads(req.body.decode("utf-8") or "{}")
    user_id = body.get("userId")
    email = body.get("email")
    if not user_id or not email:
        return HttpResponseBadRequest("userId and email required")
    out = services.start_email_verification(user_id=str(user_id), email=str(email))
    return JsonResponse({"ok": True, "jti": out["claims"]["jti"], "link": out["link"]})


def confirm(req):
    token = req.GET.get("token", "")
    if not token:
        return HttpResponseBadRequest("missing token")
    ok, payload = services.confirm_email_verification(token=token)
    return JsonResponse(payload, status=200 if ok else 400)

