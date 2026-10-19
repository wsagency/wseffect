export function checkUp8(readmeText: string, workspaceYaml: string): string[] {
  const match = /<!-- up8:start -->\s*```yaml\n([\s\S]*?)\n```\s*<!-- up8:end -->/.exec(readmeText)
  if (!match) return ['README.md: UP-8 markers or fenced YAML block are missing']
  return match[1] + '\n' === workspaceYaml
    ? []
    : ['pnpm-workspace.yaml: UP-8 block differs byte-for-byte from README.md']
}
