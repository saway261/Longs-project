declare module "next-themes"

declare module "@vercel/analytics/next" {
  export function Analytics(props: any): any
}

declare module "class-variance-authority" {
  export type VariantProps<T extends (...args: any[]) => any> = Record<string, any>
  export function cva(...args: any[]): (...args: any[]) => Record<string, string>
}

declare module "cmdk"

declare module "embla-carousel-react" {
  export type EmblaOptionsType = { axis?: "x" | "y"; [key: string]: any }
  export type EmblaCarouselType = {
    canScrollNext(): boolean
    canScrollPrev(): boolean
    scrollNext(): void
    scrollPrev(): void
    on: (event: string, handler: (...args: any[]) => void) => void
    off: (event: string, handler: (...args: any[]) => void) => void
  }
  export type UseEmblaCarouselType = [(node?: HTMLElement | null) => void, EmblaCarouselType | undefined]
  export default function useEmblaCarousel(options?: EmblaOptionsType, plugins?: any): UseEmblaCarouselType
}

declare module "react-day-picker" {
  export const DayPicker: any
  export const DayButton: any
  export function getDefaultClassNames(): any
}

declare module "tailwind-merge" {
  export function twMerge(...classes: Array<string | false | null | undefined>): string
}

declare module "vaul" {
  export const Drawer: any
  export const DrawerTrigger: any
  export const DrawerContent: any
  export const DrawerOverlay: any
  export const DrawerPortal: any
  export const DrawerClose: any
  export const DrawerHeader: any
  export const DrawerTitle: any
  export const DrawerDescription: any
}

declare module "input-otp" {
  export const OTPInput: any
  export const OTPInputContext: any
}

declare module "react-resizable-panels" {
  export const PanelGroup: any
  export const Panel: any
  export const PanelResizeHandle: any
}

declare module "sonner" {
  export const Toaster: any
  const toast: {
    (...args: any[]): any
    success(message: any, data?: any): any
    error(message: any, data?: any): any
    info(message: any, data?: any): any
    warning(message: any, data?: any): any
    loading(message: any, data?: any): any
    dismiss(id?: any): any
    promise(promise: any, data?: any): any
    message(message: any, data?: any): any
    custom(jsx: any, data?: any): any
    getHistory(): any[]
    getToasts(): any[]
  }
  export { toast }
}

declare module "@radix-ui/*"
declare module "@radix-ui/react-slot"
declare module "@radix-ui/react-accordion"
declare module "@radix-ui/react-alert-dialog"
declare module "@radix-ui/react-aspect-ratio"
declare module "@radix-ui/react-avatar"
declare module "@radix-ui/react-checkbox"
declare module "@radix-ui/react-collapsible"
declare module "@radix-ui/react-context-menu"
declare module "@radix-ui/react-dialog"
declare module "@radix-ui/react-label"
declare module "@radix-ui/react-menubar"
declare module "@radix-ui/react-navigation-menu"
declare module "@radix-ui/react-popover"
declare module "@radix-ui/react-progress"
declare module "@radix-ui/react-radio-group"
declare module "@radix-ui/react-scroll-area"
declare module "@radix-ui/react-select"
declare module "@radix-ui/react-separator"
declare module "@radix-ui/react-slider"
declare module "@radix-ui/react-switch"
declare module "@radix-ui/react-tabs"
declare module "@radix-ui/react-toast"
declare module "@radix-ui/react-toggle"
declare module "@radix-ui/react-toggle-group"
