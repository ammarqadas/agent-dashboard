// Temporary type shims for environments where dependencies are not yet installed.
// Once you run `npm install`, Next.js and Node type declarations will take over.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const process: any

declare module 'next/server' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type NextRequest = any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const NextResponse: any
}

// If the TypeScript language service isn't picking up Yarn PnP typings, these keep the editor usable.
// They are intentionally loose and should not affect runtime.
// NOTE: React types are now properly installed, so we don't need to override them
// declare module 'react' {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   export type FormEvent = any
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   export const useState: any
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   export const useEffect: any
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   const React: any
//   export default React
// }

declare module 'next/navigation' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const useRouter: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const usePathname: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const useParams: any
}

declare namespace JSX {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface IntrinsicElements {
    [elemName: string]: any
  }
}


