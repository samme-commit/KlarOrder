import Link from "next/link";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ComponentProps,
  type ReactNode,
} from "react";

import styles from "./button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "small" | "medium" | "large";

type SharedButtonProps = {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
  iconRight?: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

type ButtonProps = SharedButtonProps &
  ButtonHTMLAttributes<HTMLButtonElement>;

type ButtonLinkProps = SharedButtonProps &
  Omit<ComponentProps<typeof Link>, "children" | "className">;

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}

function getButtonClassName({
  variant = "primary",
  size = "medium",
  fullWidth = false,
  className,
}: Pick<
  SharedButtonProps,
  "variant" | "size" | "fullWidth" | "className"
>): string {
  return joinClassNames(
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className,
      fullWidth = false,
      iconRight,
      size = "medium",
      type = "button",
      variant = "primary",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={getButtonClassName({
          variant,
          size,
          fullWidth,
          className,
        })}
        {...props}
      >
        <span className={styles.label}>{children}</span>

        {iconRight ? (
          <span className={styles.iconRight} aria-hidden="true">
            {iconRight}
          </span>
        ) : null}
      </button>
    );
  },
);

export function ButtonLink({
  children,
  className,
  fullWidth = false,
  iconRight,
  size = "medium",
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={getButtonClassName({
        variant,
        size,
        fullWidth,
        className,
      })}
      {...props}
    >
      <span className={styles.label}>{children}</span>

      {iconRight ? (
        <span className={styles.iconRight} aria-hidden="true">
          {iconRight}
        </span>
      ) : null}
    </Link>
  );
}