"""
MindScapeS Frontier Talk Series 2026 - Local Server & CSV Sync Handler
Provides static file serving and handles POST /api/register to automatically
save and update registrations in CSV/registrations.csv.

Usage:
    python server.py
"""

import http.server
import socketserver
import json
import os
import csv
from datetime import datetime

PORT = int(os.environ.get('PORT', 8000))
CSV_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'CSV')
CSV_FILE = os.path.join(CSV_DIR, 'registrations.csv')

def save_or_update_csv(data):
    os.makedirs(CSV_DIR, exist_ok=True)
    fields = ['id', 'timestamp', 'name', 'email', 'affiliation', 'academic_status', 'sessions', 'remarks']
    
    records = []
    found = False
    
    # Read existing records
    if os.path.exists(CSV_FILE):
        try:
            with open(CSV_FILE, 'r', encoding='utf-8', newline='') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    records.append(row)
        except Exception as e:
            print(f"Error reading CSV: {e}")
            records = []
            
    from datetime import timezone
    reg_id = data.get('id') or f"reg_{int(datetime.now(timezone.utc).timestamp())}"
    email = data.get('email', '').strip().lower()
    timestamp = datetime.now(timezone.utc).isoformat()
    
    new_entry = {
        'id': reg_id,
        'timestamp': timestamp,
        'name': data.get('name', '').strip(),
        'email': email,
        'affiliation': data.get('affiliation', '').strip(),
        'academic_status': data.get('academic_status', '').strip(),
        'sessions': data.get('sessions', '').strip(),
        'remarks': data.get('remarks', '').strip()
    }
    
    # Check if record already exists by email or id to update
    for idx, rec in enumerate(records):
        if rec.get('email', '').strip().lower() == email or (reg_id and rec.get('id') == reg_id):
            new_entry['id'] = rec.get('id', reg_id)
            records[idx] = new_entry
            found = True
            break
            
    if not found:
        records.append(new_entry)
        
    # Write back to CSV
    with open(CSV_FILE, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for r in records:
            writer.writerow(r)
            
    # Sync to Google Forms & Google Sheets in background
    try:
        import urllib.request
        import urllib.parse
        g_url = 'https://docs.google.com/forms/d/e/1FAIpQLSc9GHa7LaAngXlcaXEmzhS1PrPtv2-zagMveQ4TSSEp_ddL7g/formResponse'
        g_payload = {
            'entry.1928414796': new_entry['name'],
            'entry.995403077': new_entry['email'],
            'entry.722565591': new_entry['affiliation'],
            'entry.1906996205': new_entry['academic_status'],
            'entry.970231916': new_entry['sessions'],
            'entry.189452490': new_entry['remarks']
        }
        req = urllib.request.Request(
            g_url,
            data=urllib.parse.urlencode(g_payload).encode('utf-8'),
            headers={'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0'}
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception as g_err:
        print(f"Google Form sync notice: {g_err}")

    return new_entry

class MindScapeSHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for local testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/register':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
                saved = save_or_update_csv(data)
                response = {
                    "success": True,
                    "message": "Registration saved successfully to CSV",
                    "data": saved
                }
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
        else:
            self.send_error(404, "Endpoint not found")

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), MindScapeSHandler) as httpd:
        print(f"MindScapeS Server running at http://localhost:{PORT}")
        print(f"CSV registrations will be stored in: {CSV_FILE}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
