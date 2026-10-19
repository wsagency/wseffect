import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { classifyFailure } from '../src/kit/classify.js'

const response = (body: string, status = 200) => new Response(body, { status })
const classify = (fetchVersion: Effect.Effect<Response, unknown>, isOnline = true) =>
  Effect.runPromise(classifyFailure({ isOnline, fetchVersion, runningBuildId: 'a' }))

describe('classifyFailure', () => {
  it('classifies an already-offline browser as Offline', async () => {
    await expect(classify(Effect.die('unused'), false)).resolves.toBe('Offline')
  })

  it('classifies a rejected version request as Offline', async () => {
    await expect(classify(Effect.fail(new Error('network')))).resolves.toBe('Offline')
  })

  it('classifies a different valid build ID as NewVersion', async () => {
    await expect(classify(Effect.succeed(response('{"buildId":"b"}')))).resolves.toBe('NewVersion')
  })

  it('classifies an equal build ID as LoadError', async () => {
    await expect(classify(Effect.succeed(response('{"buildId":"a"}')))).resolves.toBe('LoadError')
  })

  it('classifies a non-success response as LoadError', async () => {
    await expect(classify(Effect.succeed(response('{"buildId":"b"}', 404)))).resolves.toBe('LoadError')
  })

  it('HTML body classifies as LoadError', async () => {
    await expect(classify(Effect.succeed(response('<!doctype html>')))).resolves.toBe('LoadError')
  })

  it('classifies an empty response body as LoadError', async () => {
    await expect(classify(Effect.succeed(response('')))).resolves.toBe('LoadError')
  })
})
