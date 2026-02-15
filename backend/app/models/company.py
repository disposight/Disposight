import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    ticker: Mapped[str | None] = mapped_column(String(20))
    cik: Mapped[str | None] = mapped_column(String(20))
    domain: Mapped[str | None] = mapped_column(String(255))
    industry: Mapped[str | None] = mapped_column(String(255))
    sector: Mapped[str | None] = mapped_column(String(255))
    sic_code: Mapped[str | None] = mapped_column(String(10))
    employee_count: Mapped[int | None] = mapped_column(Integer)
    headquarters_city: Mapped[str | None] = mapped_column(String(255))
    headquarters_state: Mapped[str | None] = mapped_column(String(10))
    headquarters_lat: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    headquarters_lng: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    composite_risk_score: Mapped[int] = mapped_column(Integer, server_default="0")
    signal_count: Mapped[int] = mapped_column(Integer, server_default="0")
    last_signal_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    risk_trend: Mapped[str] = mapped_column(String(20), server_default="stable")
    enrichment_status: Mapped[str] = mapped_column(String(50), server_default="pending")
    enriched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    contacts_found_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    signals = relationship("Signal", back_populates="company")
    contacts = relationship("Contact", back_populates="company", lazy="noload")
