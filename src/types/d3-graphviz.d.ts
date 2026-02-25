declare module 'd3-graphviz' {
  export type GraphvizOptions = boolean | Record<string, unknown>

  export interface GraphvizRenderer {
    zoom(enable: boolean): GraphvizRenderer
    on(typenames: string, callback: (() => void) | null): GraphvizRenderer
    onerror(callback: ((error: unknown) => void) | null): GraphvizRenderer
    renderDot(dot: string): GraphvizRenderer
    destroy?: () => void
  }

  export function graphviz(
    selector: string | Element,
    options?: GraphvizOptions
  ): GraphvizRenderer
}
