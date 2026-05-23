"use client";

import React from 'react';

interface BadgeProps {
  text: any;
  color?: string;
  bg?: string;
}

export function Badge({ text, color, bg }: BadgeProps) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: "var(--radius-pill)",
        background: bg,
        color,
        display: "inline-block",
        whiteSpace: "nowrap",
        letterSpacing: "0.03em",
        border: `1px solid ${color}25`,
      }}
    >
      {text}
    </span>
  );
}

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function Card({ children, style = {}, className = "" }: CardProps) {
  return (
    <div
      className={`animate-slide-up ${className}`}
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--card-padding, 20px)",
        boxShadow: "var(--shadow-sm)",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
        e.currentTarget.style.borderColor = "var(--border-mid)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {children}
    </div>
  );
}

interface MetricCardProps {
  label: any;
  value: any;
  sub?: any;
  color?: string;
  bg?: string;
  dot?: boolean;
  icon?: any;
}

export function MetricCard({ label, value, sub, color, bg, dot, icon }: MetricCardProps) {
  return (
    <div
      className="animate-scale-in"
      style={{
        background: bg || "var(--surface)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--card-padding, 20px)",
        position: "relative",
        border: `1px solid ${color}20`,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "default",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Subtle background accent */}
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 80, height: 80, borderRadius: "50%",
        background: color, opacity: 0.06,
        pointerEvents: "none",
      }} />

      {dot && (
        <div
          className="animate-pulse"
          style={{
            position: "absolute", top: 14, right: 14,
            width: 8, height: 8, borderRadius: "50%",
            background: color,
            boxShadow: `0 0 0 3px ${color}25`,
          }}
        />
      )}

      {icon && (
        <div style={{
          width: 36, height: 36, borderRadius: "var(--radius-md)",
          background: `${color}15`, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 18, marginBottom: 12,
        }}>
          {icon}
        </div>
      )}

      <div style={{
        fontSize: 11, fontWeight: 700, color,
        textTransform: "uppercase", letterSpacing: "0.07em",
        marginBottom: 8, opacity: 0.75,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: "var(--metric-value-size, 26px)", fontWeight: 800,
        color: "var(--text)", marginBottom: 4, lineHeight: 1.1,
        letterSpacing: "-0.02em",
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</div>
    </div>
  );
}

interface SectionTitleProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  action?: any;
}

export function SectionTitle({ children, style = {}, action }: SectionTitleProps) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: action ? "space-between" : "flex-start",
      marginBottom: 16, ...style,
    }}>
      <div style={{
        fontSize: 12, fontWeight: 800, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.1em",
      }}>
        {children}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface WorkflowStepProps {
  step: any;
  label: any;
  sub?: any;
  active?: boolean;
  done?: boolean;
}

export function WorkflowStep({ step, label, sub, active, done }: WorkflowStepProps) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 14,
      marginBottom: 16, transition: "opacity 0.2s",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "var(--radius-md)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        background: done ? "var(--green-light)" : active ? "var(--primary-light)" : "var(--surface)",
        border: `1.5px solid ${done ? "var(--green)" : active ? "var(--primary)" : "var(--border)"}`,
        fontSize: 12, fontWeight: 800,
        color: done ? "var(--green)" : active ? "var(--primary)" : "var(--text-dim)",
        transition: "all 0.3s ease",
      }}>
        {done ? "✓" : step}
      </div>
      <div style={{ paddingTop: 4 }}>
        <div style={{
          fontSize: 14, fontWeight: active || done ? 700 : 500,
          color: active || done ? "var(--text)" : "var(--text-dim)",
          transition: "color 0.2s",
        }}>
          {label}
        </div>
        {sub && (
          <div style={{
            fontSize: 12, color: "var(--text-dim)", marginTop: 3, lineHeight: 1.5,
          }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: any;
  sub: any;
  icon?: any;
}

export function EmptyState({ title, sub, icon }: EmptyStateProps) {
  return (
    <div className="animate-fade-in" style={{ textAlign: "center", padding: "48px 20px" }}>
      <div style={{
        width: 52, height: 52, borderRadius: "var(--radius-lg)",
        background: "var(--surface)", border: "1px solid var(--border)",
        margin: "0 auto 16px", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 22, opacity: 0.65,
      }}>
        {icon || "📄"}
      </div>
      <div style={{
        fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6,
        maxWidth: 300, margin: "0 auto",
      }}>
        {sub}
      </div>
    </div>
  );
}

interface SpinnerProps {
  size?: number;
  color?: string;
}

export function Spinner({ size = 16, color = "var(--primary)" }: SpinnerProps) {
  return (
    <div
      className="animate-spin"
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}20`,
        borderTopColor: color,
        borderRadius: "50%",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  size?: "sm" | "md";
}

export function PrimaryButton({ children, onClick, disabled, style = {}, size = "md" }: PrimaryButtonProps) {
  const pad = size === "sm" ? "9px 16px" : "13px 20px";
  const fs  = size === "sm" ? 13 : 14;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        background: disabled ? "var(--border)" : "var(--primary)",
        color: disabled ? "var(--text-muted)" : "#fff",
        border: "none",
        borderRadius: "var(--radius-md)",
        padding: pad,
        fontSize: fs,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        transition: "all 0.18s ease",
        letterSpacing: "0.01em",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "var(--primary-dark)";
          e.currentTarget.style.boxShadow = "0 6px 16px -4px rgba(37,99,235,0.35)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "var(--primary)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {children}
    </button>
  );
}

interface SecondaryButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
  size?: "sm" | "md";
}

export function SecondaryButton({ children, onClick, style = {}, size = "md" }: SecondaryButtonProps) {
  const pad = size === "sm" ? "8px 14px" : "12px 18px";
  const fs  = size === "sm" ? 12 : 13;
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        background: "var(--card-bg)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: pad,
        fontSize: fs,
        fontWeight: 600,
        color: "var(--text-muted)",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s ease",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--primary)";
        e.currentTarget.style.color = "var(--primary)";
        e.currentTarget.style.background = "var(--primary-light)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.color = "var(--text-muted)";
        e.currentTarget.style.background = "var(--card-bg)";
      }}
    >
      {children}
    </button>
  );
}
