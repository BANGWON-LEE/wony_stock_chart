import type { FastifyPluginAsync } from 'fastify'
import {
  KisAccessTokenClient,
  KisAccessTokenConfigError,
  KisAccessTokenError,
} from '../adapters/brokers/kis/index.js'
import { fail, ok } from '../utils/http.js'

type KisAccessTokenBody = {
  forceRefresh?: boolean
}

export const brokerRoutes: FastifyPluginAsync = async app => {
  app.post(
    '/brokers/kis/access-token',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            forceRefresh: { type: 'boolean', default: false },
          },
        },
        response: {
          200: {
            type: 'object',
            required: ['success', 'data'],
            properties: {
              success: { type: 'boolean', const: true },
              data: {
                type: 'object',
                required: [
                  'accessToken',
                  'tokenType',
                  'expiresIn',
                  'expiresAt',
                ],
                properties: {
                  accessToken: { type: 'string' },
                  tokenType: { type: 'string' },
                  expiresIn: { type: 'number' },
                  expiresAt: { type: 'string' },
                },
              },
            },
          },
          '4xx': {
            type: 'object',
            required: ['success', 'error'],
            properties: {
              success: { type: 'boolean', const: false },
              error: { type: 'object' },
            },
          },
          '5xx': {
            type: 'object',
            required: ['success', 'error'],
            properties: {
              success: { type: 'boolean', const: false },
              error: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as KisAccessTokenBody
      const accessTokenClient = new KisAccessTokenClient(app.config.kis)
      console.log('request.body', request.body)
      console.log('accessTokenClient', accessTokenClient)

      try {
        const issued = await accessTokenClient.issueAccessToken(
          body.forceRefresh,
        )
        app.config.kis.accessToken = issued.accessToken

        return ok({
          accessToken: issued.accessToken,
          tokenType: issued.tokenType,
          expiresIn: issued.expiresIn,
          expiresAt: issued.expiresAt,
        })
      } catch (error) {
        if (error instanceof KisAccessTokenConfigError) {
          reply.status(500)
          return fail({
            code: 'INTERNAL_ERROR',
            message: error.message,
          })
        }

        if (error instanceof KisAccessTokenError) {
          reply.status(error.statusCode >= 500 ? 502 : 400)
          return fail({
            code: 'BROKER_API_ERROR',
            message: error.message,
            details: error.payload,
          })
        }

        throw error
      }
    },
  )

  app.post(
    '/brokers/connections',
    {
      schema: {
        body: {
          type: 'object',
          required: ['brokerType', 'credentials'],
          additionalProperties: false,
          properties: {
            brokerType: { type: 'string', enum: ['KIS'] },
            credentials: {
              type: 'object',
              required: ['appKey', 'appSecret', 'accountNo'],
              additionalProperties: false,
              properties: {
                appKey: { type: 'string', minLength: 1 },
                appSecret: { type: 'string', minLength: 1 },
                accountNo: { type: 'string', minLength: 1 },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      reply.status(201)
      return ok({
        connection: {
          id: 'bc_stub',
          brokerType: 'KIS',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        },
      })
    },
  )
}
