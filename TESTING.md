# PDFBolt Testing Guide & Invariant Verification

## 1. Running Automated Tests

Run the complete backend test suite:
```bash
python -m pytest backend/tests -v
```

Run test suite with coverage report:
```bash
python -m pytest backend/tests --cov=backend/app --cov-report=term-missing
```

---

## 2. Invariant & Regression Tests

The test suite enforces critical document invariants:

1. **Compression Regression Guard (`test_compression_regression_small_pdf`)**:
   - Ensures that when a ~75 KB document is processed, if the output size would exceed or equal the original, it is rejected and the original is returned with `saved_bytes = 0` and `is_reduced = False`.
2. **Merge Page Count Invariant (`test_merge_page_count_invariant`)**:
   - Asserts $\text{Pages}(\text{output}) = \sum \text{Pages}(\text{input}_i)$.
3. **Split Page Invariant (`test_split_page_range_invariant`)**:
   - Asserts $\text{Pages}(\text{output}) = \text{Count}(\text{requested pages})$.
4. **Output Integrity Verification (`test_output_validator.py`)**:
   - Verifies that zero-byte outputs, corrupted headers, and damaged OpenXML containers are intercepted before delivery.
5. **Path Traversal Defense (`test_filename_sanitization`)**:
   - Verifies that `../../../etc/passwd.pdf` is sanitized to `passwd.pdf`.
