"""
Medplum FHIR Server Client
Connects via OAuth2 client credentials and provides FHIR R4 operations.
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List


class MedplumFhirClient:
    """FHIR R4 client for Medplum with OAuth2 client-credentials authentication."""

    def __init__(self, client_id: str, client_secret: str,
                 base_url: str = "https://api.medplum.com/fhir/R4",
                 token_url: str = "https://api.medplum.com/oauth2/token"):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = base_url.rstrip("/")
        self.token_url = token_url
        self.access_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None

    # ── Authentication ──────────────────────────────────────────────

    def authenticate(self) -> bool:
        """Obtain access token via client credentials grant."""
        response = requests.post(self.token_url, data={
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }, headers={"Content-Type": "application/x-www-form-urlencoded"})

        if response.status_code != 200:
            print(f"❌ Authentication failed: {response.status_code}")
            print(response.text)
            return False

        token_data = response.json()
        self.access_token = token_data["access_token"]
        expires_in = token_data.get("expires_in", 3600)
        self.token_expires_at = datetime.now() + timedelta(seconds=expires_in)
        print(f"✅ Authenticated successfully (token expires in {expires_in}s)")
        return True

    def _ensure_auth(self):
        """Re-authenticate if token is expired or missing."""
        if not self.access_token or (self.token_expires_at and datetime.now() >= self.token_expires_at):
            self.authenticate()

    def _headers(self) -> Dict[str, str]:
        self._ensure_auth()
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/fhir+json",
            "Accept": "application/fhir+json",
        }

    # ── FHIR CRUD Operations ────────────────────────────────────────

    def read(self, resource_type: str, resource_id: str) -> Dict[str, Any]:
        """Read a FHIR resource by type and ID."""
        url = f"{self.base_url}/{resource_type}/{resource_id}"
        resp = requests.get(url, headers=self._headers())
        resp.raise_for_status()
        return resp.json()

    def create(self, resource: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new FHIR resource."""
        resource_type = resource.get("resourceType")
        url = f"{self.base_url}/{resource_type}"
        resp = requests.post(url, json=resource, headers=self._headers())
        resp.raise_for_status()
        return resp.json()

    def update(self, resource: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing FHIR resource (PUT)."""
        resource_type = resource.get("resourceType")
        resource_id = resource.get("id")
        url = f"{self.base_url}/{resource_type}/{resource_id}"
        resp = requests.put(url, json=resource, headers=self._headers())
        resp.raise_for_status()
        return resp.json()

    def delete(self, resource_type: str, resource_id: str) -> bool:
        """Delete a FHIR resource."""
        url = f"{self.base_url}/{resource_type}/{resource_id}"
        resp = requests.delete(url, headers=self._headers())
        return resp.status_code in (200, 204)

    def search(self, resource_type: str, params: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Search for FHIR resources."""
        url = f"{self.base_url}/{resource_type}"
        resp = requests.get(url, params=params or {}, headers=self._headers())
        resp.raise_for_status()
        return resp.json()

    # ── Server Metadata ─────────────────────────────────────────────

    def capability_statement(self) -> Dict[str, Any]:
        """Fetch the server's CapabilityStatement (metadata)."""
        url = f"{self.base_url}/metadata"
        resp = requests.get(url, headers=self._headers())
        resp.raise_for_status()
        return resp.json()

    # ── Batch / Transaction ─────────────────────────────────────────

    def batch(self, entries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute a FHIR batch Bundle."""
        bundle = {
            "resourceType": "Bundle",
            "type": "batch",
            "entry": entries,
        }
        resp = requests.post(self.base_url, json=bundle, headers=self._headers())
        resp.raise_for_status()
        return resp.json()

    def transaction(self, entries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute a FHIR transaction Bundle."""
        bundle = {
            "resourceType": "Bundle",
            "type": "transaction",
            "entry": entries,
        }
        resp = requests.post(self.base_url, json=bundle, headers=self._headers())
        resp.raise_for_status()
        return resp.json()

    # ── Validation ──────────────────────────────────────────────────

    def validate(self, resource: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a resource using $validate operation."""
        resource_type = resource.get("resourceType")
        url = f"{self.base_url}/{resource_type}/$validate"
        resp = requests.post(url, json=resource, headers=self._headers())
        return resp.json()

    # ── Helpers ──────────────────────────────────────────────────────

    def create_operation_outcome(self, severity: str, code: str, details: str) -> Dict:
        """Create a FHIR OperationOutcome for error reporting."""
        return {
            "resourceType": "OperationOutcome",
            "issue": [{
                "severity": severity,
                "code": code,
                "details": {"text": details}
            }]
        }


# ── Main: Connect and explore ───────────────────────────────────────

if __name__ == "__main__":
    CLIENT_ID = "0a0fe17a-6013-4c65-a2ab-e8eecf328bbb"
    CLIENT_SECRET = "0f9286290fd9d27c07eeb2bb4e84c624ebf08b5be8a0dbdfda6c42f775e167cd"

    client = MedplumFhirClient(client_id=CLIENT_ID, client_secret=CLIENT_SECRET)

    # 1. Authenticate
    if not client.authenticate():
        print("Failed to connect. Exiting.")
        exit(1)

    # 2. Fetch CapabilityStatement
    print("\n📋 Server CapabilityStatement:")
    cap = client.capability_statement()
    print(f"   FHIR Version: {cap.get('fhirVersion', 'unknown')}")
    print(f"   Software:     {cap.get('software', {}).get('name', 'unknown')} "
          f"v{cap.get('software', {}).get('version', '?')}")
    print(f"   Status:       {cap.get('status', 'unknown')}")

    resource_types = [r["type"] for r in cap.get("rest", [{}])[0].get("resource", [])]
    print(f"   Supported resource types: {len(resource_types)}")
    print(f"   Examples: {', '.join(resource_types[:10])}...")

    # 3. Quick search: list Patients
    print("\n👥 Patients on server:")
    bundle = client.search("Patient", {"_count": "5"})
    total = bundle.get("total", len(bundle.get("entry", [])))
    print(f"   Total: {total}")
    for entry in bundle.get("entry", []):
        pt = entry.get("resource", {})
        names = pt.get("name", [{}])
        display = "Unknown"
        if names:
            family = names[0].get("family", "")
            given = " ".join(names[0].get("given", []))
            display = f"{given} {family}".strip() or "Unknown"
        print(f"   - {display} (id: {pt.get('id', '?')})")

    print("\n✅ Connection verified. Client ready for FHIR operations.")
