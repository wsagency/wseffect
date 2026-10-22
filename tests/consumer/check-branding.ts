export function checkBranding(distModules: ReadonlyArray<{ readonly path: string; readonly source: string }>): string[] {
  const viewExports: Record<string, true> = { view: true, viewPage: true, embed: true }
  return distModules.flatMap(({ path, source }) => {
    const declarationExportsView = /\bexport\s+(?:const|let|var|function)\s+(?:view|viewPage|embed)\b/.test(source)
    const listExportsView = [...source.matchAll(/\bexport\s*\{([^}]*)\}/g)].some(([, exports]) =>
      exports.split(',').some((entry) => viewExports[entry.trim().split(/\s+as\s+/)[0]] === true),
    )
    const exportsFactory = /\bexport\s+(?:const|let|var|function)\s+create\b/.test(source)
      && /\b(?:defineView|brandViewResult)\b/.test(source)
    const importsBrand = /\bfrom\s*(['"])foldkit\/brand\1|\bimport\s*(['"])foldkit\/brand\2/.test(source)
    const delegatesToFoldkitSlider = path.replaceAll('\\', '/').endsWith('/components/slider.js')
      && /\bfrom\s*(['"])@foldkit\/ui\/slider\1|\bimport\s*(['"])@foldkit\/ui\/slider\2/.test(source)
    return (declarationExportsView || listExportsView || exportsFactory) && !importsBrand && !delegatesToFoldkitSlider
      ? [`${path}: exported view or view factory is missing a foldkit/brand import`]
      : []
  })
}
