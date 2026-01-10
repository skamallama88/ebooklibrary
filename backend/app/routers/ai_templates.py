from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import AIPromptTemplate
from ..schemas import AIPromptTemplateCreate, AIPromptTemplateUpdate, AIPromptTemplate as AIPromptTemplateSchema

router = APIRouter(
    prefix="/ai/templates",
    tags=["ai_templates"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[AIPromptTemplateSchema])
def get_templates(db: Session = Depends(get_db)):
    return db.query(AIPromptTemplate).all()

@router.post("/", response_model=AIPromptTemplateSchema)
def create_template(template: AIPromptTemplateCreate, db: Session = Depends(get_db)):
    db_template = AIPromptTemplate(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.put("/{template_id}", response_model=AIPromptTemplateSchema)
def update_template(template_id: int, template_update: AIPromptTemplateUpdate, db: Session = Depends(get_db)):
    db_template = db.query(AIPromptTemplate).filter(AIPromptTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = template_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_template, key, value)
    
    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    db_template = db.query(AIPromptTemplate).filter(AIPromptTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(db_template)
    db.commit()
    return None
