import { Effect, Option, Schema } from 'effect'
import type { FailureCause } from '../slots.js'

const VersionInfo = Schema.Struct({ buildId: Schema.String })

export function classifyFailure(input: {
  readonly isOnline: boolean
  readonly fetchVersion: Effect.Effect<Response, unknown>
  readonly runningBuildId: string
}): Effect.Effect<FailureCause> {
  if (!input.isOnline) return Effect.succeed('Offline')
  const classifyResponse = Effect.flatMap(input.fetchVersion, (response) => {
    if (!response.ok) return Effect.succeed('LoadError' as const)
    return Effect.match(
      Effect.tryPromise({ try: () => response.json(), catch: () => new Error('Invalid version response') }),
      {
        onFailure: () => 'LoadError' as const,
        onSuccess: (body) => Option.match(Schema.decodeUnknownOption(VersionInfo)(body), {
          onNone: () => 'LoadError' as const,
          onSome: ({ buildId }) => buildId === input.runningBuildId ? 'LoadError' : 'NewVersion',
        }),
      },
    )
  })
  return Effect.catch(classifyResponse, () => Effect.succeed('Offline'))
}
