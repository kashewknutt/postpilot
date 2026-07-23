import { Type } from '@sinclair/typebox'

export const AiGenerateSchema = {
  body: Type.Object({
    platform: Type.Union([
      Type.Literal('linkedin'),
      Type.Literal('x'),
      Type.Literal('youtube-studio'),
    ]),
    action: Type.Union([
      Type.Literal('rewrite'),
      Type.Literal('shorten'),
      Type.Literal('expand'),
      Type.Literal('professional'),
      Type.Literal('casual'),
      Type.Literal('informal'),
      Type.Literal('steps'),
      Type.Literal('storytelling'),
      Type.Literal('custom'),
    ]),
    content: Type.String({ minLength: 1, maxLength: 3000 }),
  }),
}
