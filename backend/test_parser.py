import json
from app.ocr_engine import run_ocr
from app.parser import parse_cnic_data

print("========================================")
print("TEST 1: Real CNIC Front (samples/cnic_front.jpg)")
print("========================================")
res1 = run_ocr("samples/cnic_front.jpg")
parsed1 = parse_cnic_data(res1["results"])
print(json.dumps(parsed1, indent=2))

print("\n========================================")
print("TEST 2: Synthetic Card (test_cnic.png)")
print("========================================")
res2 = run_ocr("test_cnic.png")
parsed2 = parse_cnic_data(res2["results"])
print(json.dumps(parsed2, indent=2))
