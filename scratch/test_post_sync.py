import requests
import json

base_url = "http://localhost:8000"

print("--- Testing Commercial Sync POST ---")
comm_payload = {
    "commercialQuotationId": "COT-2026-TEST-001",
    "projectCode": "PRY-COT-TEST-001",
    "projectName": "Proyecto de Prueba Sincronizado",
    "clientName": "Minera Las Bambas S.A.",
    "clientRuc": "20555888991",
    "purchaseOrderNumber": "OC-998877",
    "orderTotal": 150000.00,
    "approvedBudget": 150000.00,
    "currency": "PEN"
}
try:
    res = requests.post(f"{base_url}/api/proyectos-ev/commercial-sync", json=comm_payload)
    print("Commercial Sync status:", res.status_code)
    print("Response:", res.json())
except Exception as e:
    print("Error:", e)

print("\n--- Testing HR Sync Employees POST ---")
hr_payload = {
    "employees": [
        {
            "dni": "88776655",
            "fullName": "Juan Perez Desarrollador",
            "email": "juan.perez@vcsig.pe",
            "phone": "987654321",
            "areaName": "Tecnología",
            "positionName": "Ingeniero de Software Senior"
        }
    ]
}
try:
    res2 = requests.post(f"{base_url}/api/v1/hr-sync/employees", json=hr_payload)
    print("HR Sync status:", res2.status_code)
    print("Response:", res2.json())
except Exception as e:
    print("Error:", e)

print("\n--- Testing Integration History GET ---")
res3 = requests.get(f"{base_url}/api/integracion/history/")
print("History status:", res3.status_code)
print("History count:", len(res3.json()))
