import * as React from "react";

type YCLogoProps = {
  className?: string;
  alt?: string;
};

/**
 * YC logo served from /public so we don't need any special SVG loader config.
 */
export function YCLogo({ className, alt = "YC" }: YCLogoProps) {
  return <img src="/YC-LOGO-PROD.svg" alt={alt} className={className} />;
}
