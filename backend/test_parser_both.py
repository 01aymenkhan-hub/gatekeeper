import cv2
import json
from app.ocr_engine import run_ocr
from app.preprocessor import normalize_card_image, enhance_card_image
from app.parser import parse_cnic_fields

def test_image(label, path):
    print(f"\n==========================================")
    print(f"Testing {label}: {path}")
    print(f"==========================================")
    img = cv2.imread(path)
    assert img is not None, f"Could not load {path}"
    norm = normalize_card_image(img)
    enh = enhance_card_image(norm)
    ocr_res = run_ocr(enh)
    parsed = parse_cnic_fields(
        normalized_card=enh,
        pass1_ocr_results=ocr_res.get("results", []),
        ocr_runner=run_ocr
    )
    result_8_fields = {
        "fullName": parsed.get("fullName", ""),
        "fatherHusbandName": parsed.get("fatherHusbandName", ""),
        "cnicNumber": parsed.get("cnicNumber", ""),
        "gender": parsed.get("gender", ""),
        "dateOfBirth": parsed.get("dateOfBirth", ""),
        "dateOfIssue": parsed.get("dateOfIssue", ""),
        "dateOfExpiry": parsed.get("dateOfExpiry", ""),
        "cnicIdentification": parsed.get("cnicIdentification", ""),
    }
    print(json.dumps(result_8_fields, indent=2))
    return result_8_fields

smart_res = test_image("SMART CNIC", "samples/smart_cnic.jpg")
old_res = test_image("OLD CNIC", "samples/old_cnic.jpg")

print("\n--- ASSERTIONS ---")
# Smart CNIC assertions
assert smart_res["fullName"] == "Muhammad Mehmood Asim", f"Smart Name mismatch: {smart_res['fullName']}"
assert smart_res["fatherHusbandName"] == "Muhammad Asim Khan", f"Smart Father mismatch: {smart_res['fatherHusbandName']}"
assert smart_res["cnicNumber"] == "42201-4319234-7", f"Smart CNIC mismatch: {smart_res['cnicNumber']}"
assert smart_res["gender"] == "Male", f"Smart Gender mismatch: {smart_res['gender']}"
assert smart_res["dateOfBirth"] == "2003-07-24", f"Smart DOB mismatch: {smart_res['dateOfBirth']}"
assert smart_res["dateOfIssue"] == "2021-09-02", f"Smart Issue mismatch: {smart_res['dateOfIssue']}"
assert smart_res["dateOfExpiry"] == "2031-09-02", f"Smart Expiry mismatch: {smart_res['dateOfExpiry']}"
assert smart_res["cnicIdentification"] == "", f"Smart Identification should be empty: {smart_res['cnicIdentification']}"
print("Smart CNIC assertions PASSED!")

# Old CNIC assertions
assert old_res["fullName"] == "Ammar Ahmed Siddiqui", f"Old Name mismatch: {old_res['fullName']}"
assert old_res["fatherHusbandName"] == "Zafar Ahmed", f"Old Father mismatch: {old_res['fatherHusbandName']}"
assert old_res["cnicNumber"] == "42201-2050433-1", f"Old CNIC mismatch: {old_res['cnicNumber']}"
assert old_res["gender"] == "Male", f"Old Gender mismatch: {old_res['gender']}"
assert old_res["dateOfBirth"] == "1998-11-12", f"Old DOB mismatch: {old_res['dateOfBirth']}"
assert old_res["dateOfIssue"] == "", f"Old Issue should be empty: {old_res['dateOfIssue']}"
assert old_res["dateOfExpiry"] == "", f"Old Expiry should be empty: {old_res['dateOfExpiry']}"
assert old_res["cnicIdentification"] == "Nothing", f"Old Identification mismatch: {old_res['cnicIdentification']}"
print("Old CNIC assertions PASSED!")
print("\nALL BACKEND TESTS PASSED SUCCESSFULLY!")
