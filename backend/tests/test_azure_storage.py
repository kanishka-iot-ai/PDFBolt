import pytest
from backend.app.services.storage_provider import AzureBlobStorageProvider, get_storage_provider
from backend.app.config import settings


def test_azure_storage_provider_interface():
    provider = AzureBlobStorageProvider(container_name="test-container")
    assert provider.container_name == "test-container"
    
    # Test upload mock/fallback behavior
    clean_name, identifier = provider.save_upload("test-job-123", "sample document.pdf", b"%PDF-1.4 test")
    assert clean_name == "sample document.pdf"
    assert identifier.startswith("az://test-container/jobs/test-job-123/input/")
    
    # Test output save
    out_name, out_id = provider.save_output("test-job-123", "output document.pdf", b"%PDF-1.4 output")
    assert out_name == "output document.pdf"
    assert out_id.startswith("az://test-container/jobs/test-job-123/output/")
    
    # Test download URL generation (capped at 15 minutes / 900s)
    dl_url = provider.get_output_url("test-job-123", "output_document.pdf", expires_in_seconds=3600)
    assert "/api/v1/jobs/test-job-123/download/output_document.pdf" in dl_url


def test_storage_provider_factory_azure(monkeypatch):
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "azure")
    provider = get_storage_provider()
    assert isinstance(provider, AzureBlobStorageProvider)
    
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "azure_blob")
    provider = get_storage_provider()
    assert isinstance(provider, AzureBlobStorageProvider)
