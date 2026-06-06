import csv
import os
from flask import Flask, request, jsonify
from ldap3 import Server, Connection, ALL, ALL_ATTRIBUTES

app = Flask(__name__)

# CSV-Datei für Hosts
HOSTS_CSV_PATH = os.path.join(os.path.dirname(__file__), 'hosts.csv')

# LDAP-Konfiguration (anpassen!)
LDAP_SERVER = "ldap://127.0.0.1:389"
LDAP_BASE_DN = "dc=gamepanel,dc=local"
LDAP_USERNAME = "cn=admin,dc=gamepanel,dc=local"
LDAP_PASSWORD = "ldap-password"


def ensure_hosts_csv():
    if not os.path.exists(HOSTS_CSV_PATH):
        with open(HOSTS_CSV_PATH, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['name', 'address', 'api'])


def load_hosts():
    ensure_hosts_csv()
    hosts = []
    with open(HOSTS_CSV_PATH, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            hosts.append({
                'name': row.get('name', ''),
                'address': row.get('address', ''),
                'api': row.get('api', '')
            })
    return hosts


def save_host(host):
    ensure_hosts_csv()
    with open(HOSTS_CSV_PATH, 'a', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow([
            host.get('name', ''),
            host.get('address', ''),
            host.get('api', '')
        ])


@app.route('/api/hosts', methods=['GET'])
def get_hosts():
    return jsonify(load_hosts())


@app.route('/api/hosts', methods=['POST'])
def add_host():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    address = data.get('address', '').strip()
    api = data.get('api', '').strip()

    if not name or not address or not api:
        return jsonify({'success': False, 'message': 'Name, Adresse und API dürfen nicht leer sein.'}), 400

    host = {'name': name, 'address': address, 'api': api}
    save_host(host)
    return jsonify({'success': True, 'host': host}), 201


def authenticate_user(username, password):
    try:
        server = Server(LDAP_SERVER, get_info=ALL)
        conn = Connection(server, user=LDAP_USERNAME, password=LDAP_PASSWORD, auto_bind=True)
        
        # Suche nach Benutzer
        search_filter = f"(uid={username})"
        conn.search(LDAP_BASE_DN, search_filter, ALL_ATTRIBUTES)
        
        if conn.entries:
            # Prüfe das Passwort (wird hier nicht direkt getestet – muss mit bind getestet werden)
            # Hier: binden mit dem eingegebenen Passwort
            conn.bind(username, password)
            return True
        return False
    except Exception as e:
        return False

@app.route('/login', methods=['POST'])
def login():

def authenticate_user(username, password):
    try:
        server = Server(LDAP_SERVER, get_info=ALL)
        conn = Connection(server, user=LDAP_USERNAME, password=LDAP_PASSWORD, auto_bind=True)
        
        # Suche nach Benutzer
        search_filter = f"(uid={username})"
        conn.search(LDAP_BASE_DN, search_filter, ALL_ATTRIBUTES)
        
        if conn.entries:
            # Prüfe das Passwort (wird hier nicht direkt getestet – muss mit bind getestet werden)
            # Hier: binden mit dem eingegebenen Passwort
            conn.bind(username, password)
            return True
        return False
    except Exception as e:
        return False

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if authenticate_user(username, password):
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "message": "Fehler beim Login."})

if __name__  == '__main__':
    app.run(port=5000)