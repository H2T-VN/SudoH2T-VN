import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

export function Button({ children, variant = "primary", size = "md", startIcon, endIcon, className = "", ...props }: ButtonProps) {
  return (
    <button className={`${styles.button} ${styles[`variant-${variant}`]} ${styles[`size-${size}`]} ${className}`.trim()} {...props}>
      {startIcon ? <span className={styles.icon}>{startIcon}</span> : null}
      <span>{children}</span>
      {endIcon ? <span className={styles.icon}>{endIcon}</span> : null}
    </button>
  );
}
