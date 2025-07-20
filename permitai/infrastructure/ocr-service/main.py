from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import os
import tempfile
import shutil
from datetime import datetime
import hashlib
import json
import logging

# OCR imports
from paddleocr import PaddleOCR
import cv2
import numpy as np
from PIL import Image
import pdf2image
import PyPDF2

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="PermitAI OCR Service",
    description="OCR microservice for extracting text from permit documents",
    version="1.0.0"
)

# Initialize PaddleOCR
ocr = PaddleOCR(
    use_angle_cls=True,
    lang='en',
    use_gpu=False,  # Set to True if GPU is available
    det_algorithm='DB',
    rec_algorithm='SVTR_LCNet',
    show_log=False
)

class OCRResult(BaseModel):
    success: bool
    text: str
    lines: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    extracted_fields: Optional[Dict[str, Any]] = None
    confidence: float
    processing_time: float
    error: Optional[str] = None

class ExtractedPermitInfo(BaseModel):
    project_address: Optional[str] = None
    contractor_name: Optional[str] = None
    contractor_license: Optional[str] = None
    project_description: Optional[str] = None
    valuation: Optional[str] = None
    square_footage: Optional[str] = None
    permit_type: Optional[str] = None
    owner_name: Optional[str] = None
    parcel_number: Optional[str] = None
    
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ocr", "timestamp": datetime.utcnow()}

@app.post("/ocr/extract", response_model=OCRResult)
async def extract_text(
    file: UploadFile = File(...),
    extract_fields: bool = True,
    document_type: Optional[str] = None
):
    """Extract text from uploaded document using PaddleOCR"""
    
    start_time = datetime.utcnow()
    temp_path = None
    
    try:
        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix=file.filename) as tmp:
            content = await file.read()
            tmp.write(content)
            temp_path = tmp.name
        
        # Process based on file type
        if file.content_type == "application/pdf" or file.filename.lower().endswith('.pdf'):
            result = await process_pdf(temp_path, extract_fields, document_type)
        else:
            result = await process_image(temp_path, extract_fields, document_type)
        
        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        result.processing_time = processing_time
        
        return result
        
    except Exception as e:
        logger.error(f"OCR processing error: {str(e)}")
        return OCRResult(
            success=False,
            text="",
            lines=[],
            metadata={"error": str(e)},
            confidence=0.0,
            processing_time=(datetime.utcnow() - start_time).total_seconds(),
            error=str(e)
        )
    finally:
        # Cleanup temp file
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)

async def process_pdf(file_path: str, extract_fields: bool, document_type: Optional[str]) -> OCRResult:
    """Process PDF document"""
    
    all_text = ""
    all_lines = []
    
    try:
        # Convert PDF to images
        images = pdf2image.convert_from_path(file_path, dpi=300)
        
        for i, image in enumerate(images):
            # Convert PIL Image to numpy array
            img_array = np.array(image)
            
            # Run OCR on each page
            result = ocr.ocr(img_array, cls=True)
            
            # Process OCR results
            page_text, page_lines = process_ocr_result(result, page_num=i+1)
            all_text += page_text + "\n\n"
            all_lines.extend(page_lines)
        
        # Extract fields if requested
        extracted_fields = None
        if extract_fields:
            extracted_fields = extract_permit_fields(all_text, document_type)
        
        # Calculate average confidence
        confidences = [line['confidence'] for line in all_lines if 'confidence' in line]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        return OCRResult(
            success=True,
            text=all_text.strip(),
            lines=all_lines,
            metadata={
                "pages": len(images),
                "document_type": document_type,
                "file_type": "pdf"
            },
            extracted_fields=extracted_fields,
            confidence=avg_confidence
        )
        
    except Exception as e:
        logger.error(f"PDF processing error: {str(e)}")
        raise

async def process_image(file_path: str, extract_fields: bool, document_type: Optional[str]) -> OCRResult:
    """Process image document"""
    
    try:
        # Read image
        img = cv2.imread(file_path)
        
        # Run OCR
        result = ocr.ocr(img, cls=True)
        
        # Process OCR results
        text, lines = process_ocr_result(result)
        
        # Extract fields if requested
        extracted_fields = None
        if extract_fields:
            extracted_fields = extract_permit_fields(text, document_type)
        
        # Calculate average confidence
        confidences = [line['confidence'] for line in lines if 'confidence' in line]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        return OCRResult(
            success=True,
            text=text,
            lines=lines,
            metadata={
                "document_type": document_type,
                "file_type": "image",
                "dimensions": {
                    "width": img.shape[1],
                    "height": img.shape[0]
                }
            },
            extracted_fields=extracted_fields,
            confidence=avg_confidence
        )
        
    except Exception as e:
        logger.error(f"Image processing error: {str(e)}")
        raise

def process_ocr_result(result: List, page_num: int = 1) -> tuple:
    """Process PaddleOCR result into structured format"""
    
    text = ""
    lines = []
    
    if not result or not result[0]:
        return text, lines
    
    for line in result[0]:
        # Extract bounding box and text
        bbox = line[0]
        text_info = line[1]
        line_text = text_info[0]
        confidence = text_info[1]
        
        # Add to full text
        text += line_text + " "
        
        # Create structured line info
        lines.append({
            "text": line_text,
            "confidence": confidence,
            "bbox": {
                "x1": int(bbox[0][0]),
                "y1": int(bbox[0][1]),
                "x2": int(bbox[2][0]),
                "y2": int(bbox[2][1])
            },
            "page": page_num
        })
    
    return text.strip(), lines

def extract_permit_fields(text: str, document_type: Optional[str]) -> Dict[str, Any]:
    """Extract common permit fields from text using patterns and heuristics"""
    
    import re
    
    extracted = {}
    text_lower = text.lower()
    
    # Extract address
    address_patterns = [
        r'(?:project\s+)?address[:\s]+([^\n]+)',
        r'(?:site|property)\s+address[:\s]+([^\n]+)',
        r'location[:\s]+([^\n]+)',
        r'(\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|court|ct|boulevard|blvd)[^\n]*)'
    ]
    
    for pattern in address_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            extracted['project_address'] = match.group(1).strip()
            break
    
    # Extract contractor info
    contractor_patterns = [
        r'contractor[:\s]+([^\n]+)',
        r'contractor\s+name[:\s]+([^\n]+)',
        r'licensed\s+contractor[:\s]+([^\n]+)'
    ]
    
    for pattern in contractor_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            extracted['contractor_name'] = match.group(1).strip()
            break
    
    # Extract license number
    license_patterns = [
        r'license\s*(?:#|number|no\.?)?[:\s]+([A-Z0-9\-]+)',
        r'contractor\s+license[:\s]+([A-Z0-9\-]+)',
        r'lic\.?\s*(?:#|no\.?)?[:\s]+([A-Z0-9\-]+)'
    ]
    
    for pattern in license_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            extracted['contractor_license'] = match.group(1).strip()
            break
    
    # Extract project value/valuation
    value_patterns = [
        r'(?:project\s+)?(?:value|valuation|cost)[:\s]+\$?([0-9,]+(?:\.[0-9]{2})?)',
        r'estimated\s+(?:cost|value)[:\s]+\$?([0-9,]+(?:\.[0-9]{2})?)',
        r'total\s+(?:cost|value)[:\s]+\$?([0-9,]+(?:\.[0-9]{2})?)'
    ]
    
    for pattern in value_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            extracted['valuation'] = match.group(1).strip()
            break
    
    # Extract square footage
    sqft_patterns = [
        r'(?:square\s+feet|sq\.?\s*ft\.?|sf)[:\s]+([0-9,]+)',
        r'([0-9,]+)\s*(?:square\s+feet|sq\.?\s*ft\.?|sf)',
        r'area[:\s]+([0-9,]+)\s*(?:square\s+feet|sq\.?\s*ft\.?|sf)?'
    ]
    
    for pattern in sqft_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            extracted['square_footage'] = match.group(1).strip()
            break
    
    # Extract owner name
    owner_patterns = [
        r'(?:property\s+)?owner[:\s]+([^\n]+)',
        r'owner\s+name[:\s]+([^\n]+)',
        r'applicant[:\s]+([^\n]+)'
    ]
    
    for pattern in owner_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            extracted['owner_name'] = match.group(1).strip()
            break
    
    # Extract parcel number
    parcel_patterns = [
        r'(?:parcel|apn|assessor\'s\s+parcel)\s*(?:#|number|no\.?)?[:\s]+([A-Z0-9\-]+)',
        r'apn[:\s]+([A-Z0-9\-]+)',
        r'parcel\s+id[:\s]+([A-Z0-9\-]+)'
    ]
    
    for pattern in parcel_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            extracted['parcel_number'] = match.group(1).strip()
            break
    
    # Extract project description
    desc_patterns = [
        r'(?:project\s+)?description[:\s]+([^\n]+(?:\n(?!\w+:)[^\n]+)*)',
        r'scope\s+of\s+work[:\s]+([^\n]+(?:\n(?!\w+:)[^\n]+)*)',
        r'work\s+description[:\s]+([^\n]+(?:\n(?!\w+:)[^\n]+)*)'
    ]
    
    for pattern in desc_patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            desc = match.group(1).strip()
            # Limit to reasonable length
            if len(desc) > 500:
                desc = desc[:500] + "..."
            extracted['project_description'] = desc
            break
    
    # Try to determine permit type
    if document_type:
        extracted['permit_type'] = document_type
    else:
        # Try to infer from content
        if 'building' in text_lower:
            extracted['permit_type'] = 'building'
        elif 'electrical' in text_lower:
            extracted['permit_type'] = 'electrical'
        elif 'plumbing' in text_lower:
            extracted['permit_type'] = 'plumbing'
        elif 'mechanical' in text_lower:
            extracted['permit_type'] = 'mechanical'
    
    return extracted if extracted else None

@app.post("/ocr/batch")
async def batch_extract(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None
):
    """Process multiple documents in batch"""
    
    results = []
    
    for file in files:
        try:
            result = await extract_text(file, extract_fields=True)
            results.append({
                "filename": file.filename,
                "result": result
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "error": str(e)
            })
    
    return {"results": results, "total": len(files)}

@app.get("/ocr/supported-formats")
async def get_supported_formats():
    """Get list of supported file formats"""
    
    return {
        "formats": [
            {"extension": ".pdf", "mime_type": "application/pdf", "description": "PDF documents"},
            {"extension": ".jpg", "mime_type": "image/jpeg", "description": "JPEG images"},
            {"extension": ".jpeg", "mime_type": "image/jpeg", "description": "JPEG images"},
            {"extension": ".png", "mime_type": "image/png", "description": "PNG images"},
            {"extension": ".tiff", "mime_type": "image/tiff", "description": "TIFF images"},
            {"extension": ".tif", "mime_type": "image/tiff", "description": "TIFF images"},
            {"extension": ".bmp", "mime_type": "image/bmp", "description": "BMP images"}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)