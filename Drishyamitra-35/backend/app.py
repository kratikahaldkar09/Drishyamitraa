from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import json
from threading import Lock
from uuid import uuid4
import re
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
from datetime import datetime

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    app.config["UPLOAD_DIR"] = upload_dir
    people_dir = os.path.join(upload_dir, "people")
    os.makedirs(people_dir, exist_ok=True)
    app.config["PEOPLE_DIR"] = people_dir
    
    labels_path = os.path.join(upload_dir, "labels.json")
    user_path = os.path.join(upload_dir, "user.json")
    email_log_path = os.path.join(upload_dir, "email_log.json")
    meta_path = os.path.join(upload_dir, "meta.json")
    people_meta_path = os.path.join(people_dir, "people.json")
    
    labels_lock = Lock()
    meta_lock = Lock()
    people_lock = Lock()

    def load_labels():
        if not os.path.exists(labels_path): return {}
        try:
            with open(labels_path, "r", encoding="utf-8") as f: return json.load(f)
        except Exception: return {}

    def save_labels(d):
        with labels_lock:
            tmp = labels_path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f: json.dump(d, f, ensure_ascii=False, indent=2)
            os.replace(tmp, labels_path)

    def load_user():
        if not os.path.exists(user_path): return {"username": "User", "email": "", "accounts": [], "active_account": 0, "total_shared": 0}
        try:
            with open(user_path, "r", encoding="utf-8") as f:
                d = json.load(f)
                return {
                    "username": d.get("username") or "User",
                    "email": d.get("email") or "",
                    "accounts": d.get("accounts") or [],
                    "active_account": d.get("active_account") or 0,
                    "total_shared": d.get("total_shared") or 0
                }
        except Exception: return {"username": "User", "email": "", "accounts": [], "active_account": 0, "total_shared": 0}

    def save_user(d):
        tmp = user_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump({
                "username": d.get("username") or "User",
                "email": d.get("email") or "",
                "accounts": d.get("accounts") or [],
                "active_account": d.get("active_account") or 0,
                "total_shared": d.get("total_shared") or 0
            }, f, ensure_ascii=False, indent=2)
        os.replace(tmp, user_path)

    def load_email_log():
        if not os.path.exists(email_log_path): return []
        try:
            with open(email_log_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                logs = data if isinstance(data, list) else [data]
                # Ensure each log has an ID
                modified = False
                for log in logs:
                    if not log.get("id"):
                        log["id"] = uuid4().hex
                        modified = True
                if modified:
                    with open(email_log_path, "w", encoding="utf-8") as fw:
                        json.dump(logs, fw, ensure_ascii=False, indent=2)
                return logs
        except Exception: return []

    def save_email_log(d):
        logs = load_email_log()
        # Ensure log has id
        if "id" not in d: d["id"] = uuid4().hex
        logs.insert(0, d) # Newest first
        tmp = email_log_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f: json.dump(logs[:100], f, ensure_ascii=False, indent=2) # Keep last 100
        os.replace(tmp, email_log_path)

    def load_meta():
        if not os.path.exists(meta_path): return {}
        try:
            with open(meta_path, "r", encoding="utf-8") as f: return json.load(f)
        except Exception: return {}

    def save_meta(d):
        with meta_lock:
            tmp = meta_path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f: json.dump(d, f, ensure_ascii=False, indent=2)
            os.replace(tmp, meta_path)
    
    def iter_photos_root():
        for name in os.listdir(app.config["UPLOAD_DIR"]):
            p = os.path.join(app.config["UPLOAD_DIR"], name)
            if os.path.isfile(p) and not name.endswith(".json"):
                yield name, p, None, None
    
    def iter_photos_people():
        pdata = load_people()
        base = app.config["PEOPLE_DIR"]
        if not os.path.isdir(base): return
        for pid in os.listdir(base):
            pdir = os.path.join(base, pid)
            if not os.path.isdir(pdir): continue
            person_name = (pdata.get(pid) or {}).get("name") or pid
            for fname in os.listdir(pdir):
                fp = os.path.join(pdir, fname)
                if os.path.isfile(fp):
                    rel = os.path.join("people", pid, fname).replace("\\", "/")
                    yield rel, fp, pid, person_name
    
    def load_people():
        if not os.path.exists(people_meta_path): return {}
        try:
            with open(people_meta_path, "r", encoding="utf-8") as f: return json.load(f)
        except Exception: return {}
    
    def save_people(d):
        with people_lock:
            tmp = people_meta_path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f: json.dump(d, f, ensure_ascii=False, indent=2)
            os.replace(tmp, people_meta_path)
    
    def slugify(s):
        s = re.sub(r"[^a-zA-Z0-9]+", "-", str(s).strip().lower())
        s = re.sub(r"-+", "-", s).strip("-")
        return s or uuid4().hex[:8]

    gmail_user = (os.getenv("GMAIL_USER") or os.getenv("EMAIL_USER") or os.getenv("SMTP_USER") or "").strip()
    gmail_pass = (os.getenv("GMAIL_APP_PASSWORD") or os.getenv("EMAIL_PASSWORD") or os.getenv("SMTP_PASSWORD") or "").strip()
    groq_key = (os.getenv("GROQ_API_KEY") or "").strip()
    groq_client = None
    if groq_key:
        try:
            from groq import Groq as _Groq
            groq_client = _Groq(api_key=groq_key)
        except Exception:
            groq_client = None

    def get_active_creds():
        u = load_user()
        accs = u.get("accounts") or []
        idx = u.get("active_account") or 0
        if 0 <= idx < len(accs):
            a = accs[idx]
            return {
                "gmail_user": a.get("gmail_user") or gmail_user,
                "gmail_pass": a.get("gmail_pass") or gmail_pass,
                "groq_key": a.get("groq_key") or groq_key
            }
        return {"gmail_user": gmail_user, "gmail_pass": gmail_pass, "groq_key": groq_key}

    @app.get("/health")
    def health():
        return jsonify(status="ok"), 200

    @app.post("/api/intent")
    def intent():
        data = request.get_json(silent=True) or {}
        raw_text = data.get("text", "")
        text = str(raw_text).lower()
        
        m_email = re.search(r"([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)", raw_text)
        m_label = re.search(r"(?:photos?|pics?)?\s*of\s+([a-z0-9._ -]+?)(?=\b|$)", text, re.IGNORECASE)
        m_label_before = re.search(r"send\s+([a-z0-9._ -]+?)\s+(?:photos?|pics?)\s+to\b", text, re.IGNORECASE)

        creds = get_active_creds()
        active_groq_key = creds.get("groq_key")
        active_groq_client = None
        if active_groq_key:
            try:
                from groq import Groq as _Groq
                active_groq_client = _Groq(api_key=active_groq_key)
            except Exception:
                active_groq_client = None
        elif groq_client:
            active_groq_client = groq_client

        if active_groq_client and raw_text:
            try:
                r = active_groq_client.chat.completions.create(
                    model="llama3-8b-8192",
                    messages=[
                        {"role": "system", "content": "You classify requests about photos into intents: greeting, find_photos(label), send_photos(email,label). Respond as JSON with keys intent,label,email."},
                        {"role": "user", "content": raw_text}
                    ],
                    temperature=0
                )
                content = r.choices[0].message.content
                import json as _json
                parsed = _json.loads(content)
                
                if parsed.get("intent") == "send_photos":
                    email = parsed.get("email") or (m_email.group(1) if m_email else "")
                    label = parsed.get("label") or (m_label.group(1).strip() if m_label else None)
                    lab = (label or "").lower().strip()
                    labels_map = load_labels()
                    pdata = load_people()
                    c = 0
                    if not lab:
                        for _n, *_ in iter_photos_root(): c += 1
                        for _r, *_ in iter_photos_people(): c += 1
                    else:
                        for n, *_ in iter_photos_root():
                            if str(labels_map.get(n, "")).lower().strip() == lab: c += 1
                        for _rel, _p, pid, person_name in iter_photos_people():
                            if (person_name or "").lower().strip() == lab: c += 1
                    return jsonify(intent="send_photos_prepare", email=email, count=c, label=label), 200
                
                if parsed.get("intent") == "find_photos":
                    label = parsed.get("label") or (m_label.group(1).strip() if m_label else None)
                    c = 0
                    urls = []
                    if label:
                        lab = label.lower().strip()
                        labels_map = load_labels()
                        for n, *_ in iter_photos_root():
                            if str(labels_map.get(n, "")).lower().strip() == lab:
                                c += 1
                                urls.append(f"/uploads/{n}")
                        for rel, _p, pid, person_name in iter_photos_people():
                            if (person_name or "").lower().strip() == lab:
                                c += 1
                                clean_rel = rel.replace("\\", "/")
                                urls.append(f"/uploads/{clean_rel}")
                    return jsonify(intent="find_photos", label=label, count=c, urls=urls), 200
            except Exception:
                pass

        # Fallback to regex
        if ("send" in text or "email" in text) and m_email:
            email = m_email.group(1)
            label = m_label.group(1).strip() if m_label else (m_label_before.group(1).strip() if m_label_before else None)
            count = 0
            urls = []
            if not label:
                for n, *_ in iter_photos_root():
                    count += 1
                    urls.append(f"/uploads/{n}")
                for rel, *_ in iter_photos_people():
                    count += 1
                    clean_rel = rel.replace("\\", "/")
                    urls.append(f"/uploads/{clean_rel}")
            else:
                lab = label.lower().strip()
                labels_map = load_labels()
                for n, *_ in iter_photos_root():
                    if str(labels_map.get(n, "")).lower().strip() == lab:
                        count += 1
                        urls.append(f"/uploads/{n}")
                for rel, _p, pid, person_name in iter_photos_people():
                    if (person_name or "").lower().strip() == lab:
                        count += 1
                        clean_rel = rel.replace("\\", "/")
                        urls.append(f"/uploads/{clean_rel}")
            return jsonify(intent="send_photos_prepare", email=email, count=count, label=label, urls=urls), 200
        
        if m_label and ("find" in text or "show" in text or "photos" in text):
            label = m_label.group(1).strip()
            count = 0
            urls = []
            lab = label.lower().strip()
            labels_map = load_labels()
            for n, *_ in iter_photos_root():
                if str(labels_map.get(n, "")).lower().strip() == lab:
                    count += 1
                    urls.append(f"/uploads/{n}")
            for rel, _p, pid, person_name in iter_photos_people():
                if (person_name or "").lower().strip() == lab:
                    count += 1
                    clean_rel = rel.replace("\\", "/")
                    urls.append(f"/uploads/{clean_rel}")
            return jsonify(intent="find_photos", label=label, count=count, urls=urls), 200
            
        intent_value = "greeting" if "hello" in text or "hi" in text else "unknown"
        return jsonify(intent=intent_value), 200

    @app.post("/api/detect-faces")
    def detect_faces():
        return jsonify(detected_faces=[]), 200

    @app.get("/api/user")
    def get_user():
        return jsonify(load_user()), 200

    @app.post("/api/user")
    def set_user():
        data = request.get_json(silent=True) or {}
        save_user(data)
        return jsonify(ok=True), 200

    @app.post("/api/photos")
    def upload_photos():
        if "files" not in request.files:
            return jsonify({"error": "No files uploaded"}), 400
        files = request.files.getlist("files")
        results = []
        for file in files:
            if not file or not file.filename: continue
            filename = f"{uuid4().hex}_{secure_filename(file.filename)}"
            path = os.path.join(app.config["UPLOAD_DIR"], filename)
            file.save(path)
            results.append({"name": filename, "url": f"/uploads/{filename}"})
        return jsonify(files=results), 200

    @app.get("/api/stats")
    def get_stats():
        logs = load_email_log()
        shared = sum(1 for log in logs if log.get("emailed"))
        
        files = []
        now = datetime.now()
        this_month_count = 0
        for name, path, _, _ in iter_photos_root():
            mtime = datetime.fromtimestamp(os.path.getmtime(path))
            if mtime.year == now.year and mtime.month == now.month: this_month_count += 1
            files.append(name)
        for rel, path, _, _ in iter_photos_people():
            mtime = datetime.fromtimestamp(os.path.getmtime(path))
            if mtime.year == now.year and mtime.month == now.month: this_month_count += 1
            files.append(rel)
            
        return jsonify({
            "total": len(files),
            "this_month": this_month_count,
            "shared": shared,
            "favorites": 0
        }), 200

    @app.get("/api/photos")
    def list_photos():
        labels = load_labels()
        meta = load_meta()
        files = []
        for name, path, _, _ in iter_photos_root():
            mtime = os.path.getmtime(path)
            files.append({"name": name, "size": os.path.getsize(path), "url": f"/uploads/{name}", "label": labels.get(name), "event": meta.get(name, {}).get("event"), "location": meta.get(name, {}).get("location"), "created_at": datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")})
        for rel, path, pid, person_name in iter_photos_people():
            mtime = os.path.getmtime(path)
            label_value = person_name
            rel_path = rel.replace("\\", "/")
            files.append({"name": rel_path, "size": os.path.getsize(path), "url": f"/uploads/{rel_path}", "label": label_value, "event": meta.get(rel, {}).get("event"), "location": meta.get(rel, {}).get("location"), "created_at": datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")})
        files.sort(key=lambda x: x["name"])
        return jsonify(files=files), 200

    @app.delete("/api/photos/<path:filename>")
    def delete_photo(filename):
        path = os.path.join(app.config["UPLOAD_DIR"], filename)
        if os.path.exists(path):
            os.remove(path)
            labels = load_labels()
            if filename in labels:
                del labels[filename]
                save_labels(labels)
            meta = load_meta()
            if filename in meta:
                del meta[filename]
                save_meta(meta)
            return jsonify(message="Deleted"), 200
        return jsonify(error="Not found"), 404

    @app.post("/api/photos/<path:filename>/label")
    def set_label(filename):
        path = os.path.join(app.config["UPLOAD_DIR"], filename)
        if not os.path.exists(path): return jsonify(error="not found"), 404
        data = request.get_json(silent=True) or {}
        label = data.get("label", "").strip()
        labels = load_labels()
        if label: labels[filename] = label
        elif filename in labels: del labels[filename]
        save_labels(labels)
        return jsonify(ok=True, label=label), 200

    @app.post("/api/photos/<path:filename>/meta")
    def set_meta(filename):
        path = os.path.join(app.config["UPLOAD_DIR"], filename)
        if not os.path.exists(path): return jsonify(error="not found"), 404
        data = request.get_json(silent=True) or {}
        event = (data.get("event") or "").strip()
        location = (data.get("location") or "").strip()
        meta = load_meta()
        entry = meta.get(filename) or {}
        if event: entry["event"] = event
        if location: entry["location"] = location
        meta[filename] = entry
        save_meta(meta)
        return jsonify(ok=True, event=event or None, location=location or None), 200

    @app.get("/uploads/<path:filename>")
    def uploads(filename):
        return send_from_directory(app.config["UPLOAD_DIR"], filename)

    @app.get("/api/people")
    def list_people():
        data = load_people()
        res = []
        for pid, info in data.items():
            pdir = os.path.join(app.config["PEOPLE_DIR"], pid)
            cnt = 0
            pimg = None
            if os.path.isdir(pdir):
                files = [n for n in os.listdir(pdir) if os.path.isfile(os.path.join(pdir, n))]
                cnt = len(files)
                if files:
                    pimg = f"/uploads/people/{pid}/{files[0]}"
            res.append({"id": pid, "name": info.get("name") or pid, "profileImage": pimg, "count": cnt})
        res.sort(key=lambda x: x["name"])
        return jsonify(res), 200
    
    @app.post("/api/people")
    def create_person():
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        if not name: return jsonify(error="name required"), 400
        pid_base = slugify(name)
        pid = pid_base
        existing = load_people()
        i = 1
        while pid in existing:
            pid = f"{pid_base}-{i}"
            i += 1
        os.makedirs(os.path.join(app.config["PEOPLE_DIR"], pid), exist_ok=True)
        existing[pid] = {"name": name}
        save_people(existing)
        return jsonify(id=pid, name=name), 200
    
    @app.get("/api/people/<path:pid>")
    def get_person(pid):
        data = load_people()
        if pid not in data: return jsonify(error="not found"), 404
        pdir = os.path.join(app.config["PEOPLE_DIR"], pid)
        items = []
        if os.path.isdir(pdir):
            for n in sorted(os.listdir(pdir)):
                p = os.path.join(pdir, n)
                if os.path.isfile(p):
                    items.append({"name": n, "url": f"/uploads/people/{pid}/{n}"})
        return jsonify(id=pid, name=data[pid].get("name") or pid, photos=items), 200
    
    @app.post("/api/people/<path:pid>/photos")
    def add_person_photos(pid):
        data = load_people()
        if pid not in data: return jsonify(error="not found"), 404
        if "files" not in request.files: return jsonify(error="no files"), 400
        pdir = os.path.join(app.config["PEOPLE_DIR"], pid)
        os.makedirs(pdir, exist_ok=True)
        files = request.files.getlist("files")
        results = []
        for file in files:
            if not file or not file.filename: continue
            fname = f"{uuid4().hex}_{secure_filename(file.filename)}"
            path = os.path.join(pdir, fname)
            file.save(path)
            results.append({"name": fname, "url": f"/uploads/people/{pid}/{fname}"})
        return jsonify(files=results), 200
    
    @app.patch("/api/people/<path:pid>")
    def rename_person(pid):
        data = load_people()
        if pid not in data: return jsonify(error="not found"), 404
        body = request.get_json(silent=True) or {}
        name = (body.get("name") or "").strip()
        if not name: return jsonify(error="name required"), 400
        data[pid]["name"] = name
        save_people(data)
        return jsonify(id=pid, name=name), 200
    
    @app.delete("/api/people/<path:pid>")
    def delete_person(pid):
        data = load_people()
        if pid not in data: return jsonify(error="not found"), 404
        pdir = os.path.join(app.config["PEOPLE_DIR"], pid)
        if os.path.isdir(pdir):
            for n in os.listdir(pdir):
                p = os.path.join(pdir, n)
                try:
                    if os.path.isfile(p): os.remove(p)
                except Exception:
                    pass
            try:
                os.rmdir(pdir)
            except Exception:
                pass
        del data[pid]
        save_people(data)
        return jsonify(ok=True), 200
    
    @app.delete("/api/people/<path:pid>/photos/<path:fname>")
    def delete_person_photo(pid, fname):
        pdir = os.path.join(app.config["PEOPLE_DIR"], pid)
        path = os.path.join(pdir, fname)
        if not os.path.exists(path): return jsonify(error="not found"), 404
        os.remove(path)
        return jsonify(ok=True), 200

    @app.post("/api/send-photos")
    def send_photos():
        data = request.get_json(silent=True) or {}
        email = data.get("email", "")
        label = (data.get("label") or "").strip()
        labels_map = load_labels()
        files = []
        pdata = load_people()
        if not label:
            for name, _, _, _ in iter_photos_root(): files.append(name)
            for rel, _, _, _ in iter_photos_people(): files.append(rel)
        else:
            lab = label.lower().strip()
            for name, _, _, _ in iter_photos_root():
                if str(labels_map.get(name, "")).lower().strip() == lab: files.append(name)
            for rel, _, pid, _ in iter_photos_people():
                person_name = (pdata.get(pid) or {}).get("name") or pid
                if person_name.lower().strip() == lab: files.append(rel)
        
        sent = False
        reason = None
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        creds = get_active_creds()
        active_user = creds.get("gmail_user")
        active_pass = creds.get("gmail_pass")
        
        if active_user and active_pass and email:
            msg = EmailMessage()
            msg["Subject"] = f"{len(files)} Attachments: Photos of {label}" if label else f"{len(files)} Attachments: Photos from Drishyamitra"
            msg["From"] = active_user
            msg["To"] = email
            
            body = f"Hello,\n\nHere are {len(files)} photos"
            if label:
                body += f" of {label}"
            body += f" you requested from Drishyamitra.\n\nTotal Attachments: {len(files)}\nSent on: {now_str}\n\nBest regards,\nDrishyamitra Assistant"
            msg.set_content(body)
            
            for fname in files:
                path = os.path.join(app.config["UPLOAD_DIR"], fname)
                if not os.path.exists(path): continue
                with open(path, "rb") as f: 
                    data_bytes = f.read()
                
                # Determine subtype from extension
                ext = os.path.splitext(fname)[1].lower().replace(".", "")
                subtype = ext if ext in ["jpeg", "jpg", "png", "gif", "webp"] else "jpeg"
                if subtype == "jpg": subtype = "jpeg"
                
                msg.add_attachment(
                    data_bytes, 
                    maintype="image", 
                    subtype=subtype, 
                    filename=os.path.basename(fname)
                )
            
            try:
                with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
                    s.login(active_user, active_pass)
                    s.send_message(msg)
                sent = True
            except Exception as e:
                reason = f"smtp_error: {type(e).__name__}"
        else: reason = "missing_credentials"
        
        log_entry = {"from": active_user, "to": email, "label": label, "count": len(files), "sent_on": now_str, "emailed": sent, "reason": reason}
        save_email_log(log_entry)
        
        if sent:
            u = load_user()
            u["total_shared"] = (u.get("total_shared") or 0) + 1
            save_user(u)
            
        return jsonify(ok=True, email=email, label=label, count=len(files), emailed=sent, reason=reason), 200

    @app.get("/api/email-log")
    def get_email_log():
        return jsonify(load_email_log()), 200

    @app.delete("/api/email-log/<path:log_id>")
    def delete_email_log(log_id):
        logs = load_email_log()
        new_logs = [log for log in logs if log.get("id") != log_id]
        if len(new_logs) == len(logs): return jsonify(error="not found"), 404
        
        tmp = email_log_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f: json.dump(new_logs, f, ensure_ascii=False, indent=2)
        os.replace(tmp, email_log_path)
        return jsonify(ok=True), 200

    @app.get("/api/email-config")
    def email_config():
        return jsonify(configured=bool(gmail_user and gmail_pass), from_addr=gmail_user or None, has_password=bool(gmail_pass)), 200

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
