import * as React from "react"

import { cn } from "@/lib/utils"

type MajlisConnectLogoProps = React.SVGProps<SVGSVGElement> & {
  /**
   * Use "mark" for the icon only (default). "lockup" includes the wordmark.
   */
  variant?: "mark" | "lockup"
}

export function MajlisConnectLogo({ className, variant = "mark", ...props }: MajlisConnectLogoProps) {
  if (variant === "lockup") {
    return (
      <svg
        viewBox="0 0 180 24"
        aria-label="Majlis Connect"
        role="img"
        className={cn("h-6 w-auto", className)}
        {...props}
      >
        <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 18V7l6 6 6-6v11" />
          <path d="M7.2 6.2h1.2" />
          <path d="M27.6 6.2h1.2" />
          <circle cx="18" cy="13" r="1.6" fill="currentColor" stroke="none" />
        </g>
        <g fill="currentColor">
          <path d="M50.2 17V7.2h2.4l4 6.9 4-6.9H63V17h-2.2v-6.2l-3.5 5.9h-1.5l-3.5-5.9V17h-2.1Z" />
          <path d="M70.5 17.2c-1.4 0-2.5-.4-3.3-1.2-.8-.8-1.2-1.9-1.2-3.3s.4-2.5 1.2-3.3c.8-.8 1.9-1.2 3.3-1.2 1.1 0 2 .3 2.7.8.7.5 1.2 1.3 1.4 2.3h-2.2c-.1-.5-.4-.9-.8-1.2-.4-.3-.9-.4-1.5-.4-.8 0-1.4.2-1.8.7-.4.5-.7 1.2-.7 2.1s.2 1.6.7 2.1c.4.5 1 .7 1.8.7.6 0 1.1-.1 1.5-.4.4-.3.7-.7.8-1.2h2.2c-.2 1-.7 1.8-1.4 2.3-.7.5-1.6.8-2.7.8Z" />
          <path d="M82.2 17.2c-1.4 0-2.6-.4-3.4-1.2-.9-.8-1.3-1.9-1.3-3.3s.4-2.5 1.2-3.3c.8-.8 1.9-1.2 3.3-1.2 1.3 0 2.3.4 3.1 1.1.8.7 1.2 1.7 1.2 3v.7h-6.6c.1.8.3 1.4.8 1.8.5.4 1.1.7 1.9.7.5 0 1-.1 1.4-.3.4-.2.7-.5.8-.9h2.2c-.2.9-.8 1.6-1.6 2.1-.8.5-1.8.8-3 .8Zm-2.3-5.7h4.4c-.1-.7-.3-1.2-.7-1.6-.4-.4-.9-.6-1.6-.6-.7 0-1.2.2-1.6.6-.4.4-.6.9-.7 1.6Z" />
          <path d="M89.4 17V8.3h2v1.2c.3-.5.7-.9 1.2-1.1.5-.3 1.1-.4 1.8-.4 1.1 0 1.9.3 2.5 1 .6.7.9 1.6.9 2.8V17h-2.1v-5c0-.8-.2-1.4-.5-1.8-.3-.4-.8-.6-1.5-.6-.8 0-1.3.2-1.7.7-.4.5-.6 1.1-.6 1.9V17h-2Z" />
          <path d="M103.7 17.2c-1 0-1.8-.2-2.3-.7-.5-.5-.8-1.2-.8-2.2V10h-1.6V8.3h1.6V6.2h2V8.3h2.2V10h-2.2v4c0 .5.1.8.3 1 .2.2.5.3 1 .3h.9V17c-.3.1-.7.2-1.1.2Z" />
          <path d="M108.6 6.9c-.4 0-.7-.1-1-.4-.3-.3-.4-.6-.4-1s.1-.7.4-1c.3-.3.6-.4 1-.4s.7.1 1 .4c.3.3.4.6.4 1s-.1.7-.4 1c-.3.3-.6.4-1 .4Zm-1 10.1V8.3h2.1V17h-2.1Z" />
          <path d="M116.6 17.2c-1.2 0-2.2-.3-3-.8-.8-.5-1.2-1.3-1.3-2.2h2.1c.1.4.3.8.7 1 .4.2.9.4 1.6.4.6 0 1.1-.1 1.4-.3.3-.2.5-.5.5-.9 0-.3-.1-.6-.4-.7-.3-.2-.8-.3-1.6-.5l-.8-.1c-1-.2-1.8-.5-2.3-.9-.5-.4-.8-1-.8-1.8 0-.9.4-1.6 1.1-2.1.7-.5 1.7-.8 2.9-.8 1.1 0 2 .2 2.7.7.7.5 1.1 1.2 1.2 2.1h-2c-.1-.4-.3-.7-.6-.9-.3-.2-.8-.3-1.3-.3-.6 0-1 .1-1.3.3-.3.2-.5.5-.5.8 0 .3.1.5.4.7.3.2.8.3 1.6.4l.8.1c1.1.2 1.9.5 2.4.9.5.4.8 1.1.8 1.8 0 .9-.4 1.6-1.1 2.1-.7.5-1.8.8-3.1.8Z" />
        </g>
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-label="Majlis Connect"
      role="img"
      className={cn("h-6 w-6", className)}
      {...props}
    >
      <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        {/* M shape */}
        <path d="M5 18V7l7 7 7-7v11" />
        {/* subtle “connection” endpoints */}
        <path d="M4.2 6.2h1.3" />
        <path d="M18.5 6.2h1.3" />
        <circle cx="12" cy="14" r="1.7" fill="currentColor" stroke="none" />
      </g>
    </svg>
  )
}


