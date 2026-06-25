export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Brackeroni API",
    version: "0.1.0",
    description: "REST contract for the Brackeroni MVP."
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development"
    }
  ],
  components: {
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: {}
            },
            required: ["code", "message"]
          }
        },
        required: ["error"]
      },
      CandidateSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: ["string", "null"] },
          imageUrl: { type: ["string", "null"], format: "uri" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        },
        required: ["id", "name", "description", "imageUrl", "createdAt", "updatedAt"]
      },
      CandidateListResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/CandidateSummary" }
          },
          meta: {
            type: "object",
            properties: {
              count: { type: "integer" }
            },
            required: ["count"]
          }
        },
        required: ["items", "meta"]
      },
      CandidateDetailResponse: {
        type: "object",
        properties: {
          item: { $ref: "#/components/schemas/CandidateSummary" }
        },
        required: ["item"]
      },
      CandidateCreateRequest: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 120 },
          description: { type: ["string", "null"], maxLength: 2000 },
          imageUrl: { type: ["string", "null"], format: "uri", maxLength: 2048 }
        },
        required: ["name"]
      },
      PoolCandidate: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: ["string", "null"] },
          imageUrl: { type: ["string", "null"], format: "uri" },
          displayOrder: { type: ["integer", "null"] }
        },
        required: ["id", "name", "description", "imageUrl", "displayOrder"]
      },
      Pool: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: ["string", "null"] },
          archivedAt: { type: ["string", "null"], format: "date-time" },
          candidateCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        },
        required: ["id", "name", "description", "archivedAt", "candidateCount", "createdAt", "updatedAt"]
      },
      PoolDetail: {
        allOf: [
          { $ref: "#/components/schemas/Pool" },
          {
            type: "object",
            properties: {
              candidates: {
                type: "array",
                items: { $ref: "#/components/schemas/PoolCandidate" }
              }
            },
            required: ["candidates"]
          }
        ]
      },
      PoolListResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/Pool" }
          },
          meta: {
            type: "object",
            properties: {
              count: { type: "integer" }
            },
            required: ["count"]
          }
        },
        required: ["items", "meta"]
      },
      PoolDetailResponse: {
        type: "object",
        properties: {
          item: { $ref: "#/components/schemas/PoolDetail" }
        },
        required: ["item"]
      },
      PoolSourceExtract: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["extract"] },
          prompt: { type: "string", minLength: 1, maxLength: 12000 },
          pageTitle: { type: ["string", "null"], maxLength: 300 },
          pageUrl: { type: ["string", "null"], format: "uri", maxLength: 2048 },
          text: { type: ["string", "null"] },
          html: { type: ["string", "null"] },
          urls: {
            type: "array",
            maxItems: 20,
            items: { type: "string", format: "uri", maxLength: 2048 }
          },
          model: { type: "string", maxLength: 120 }
        },
        required: ["type", "prompt"]
      },
      PoolSourceItem: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 120 },
          description: { type: ["string", "null"], maxLength: 2000 },
          imageUrl: { type: ["string", "null"], format: "uri", maxLength: 2048 },
          sourceUrl: { type: ["string", "null"], format: "uri", maxLength: 2048 }
        },
        required: ["name"]
      },
      PoolSourceItems: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["items"] },
          items: {
            type: "array",
            minItems: 1,
            maxItems: 1000,
            items: { $ref: "#/components/schemas/PoolSourceItem" }
          }
        },
        required: ["type", "items"]
      },
      PoolCreateRequest: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 120 },
          description: { type: ["string", "null"], maxLength: 2000 },
          source: {
            oneOf: [
              { $ref: "#/components/schemas/PoolSourceExtract" },
              { $ref: "#/components/schemas/PoolSourceItems" }
            ]
          }
        },
        required: ["name"]
      },
      PoolCreateResponse: {
        type: "object",
        properties: {
          item: { $ref: "#/components/schemas/PoolDetail" }
        },
        required: ["item"]
      }
    }
  },
  paths: {
    "/api/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": {
            description: "Service health"
          }
        }
      }
    },
    "/api/candidates": {
      get: {
        summary: "List candidates owned by the current user",
        responses: {
          "200": {
            description: "Candidate collection",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CandidateListResponse" }
              }
            }
          }
        }
      },
      post: {
        summary: "Create a candidate",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CandidateCreateRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Candidate created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CandidateDetailResponse" }
              }
            }
          }
        }
      }
    },
    "/api/candidates/{candidateId}": {
      get: {
        summary: "Fetch a candidate",
        parameters: [
          {
            name: "candidateId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Candidate resource",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CandidateDetailResponse" }
              }
            }
          }
        }
      },
      patch: {
        summary: "Update a candidate",
        parameters: [
          {
            name: "candidateId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Candidate updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CandidateDetailResponse" }
              }
            }
          }
        }
      }
    },
    "/api/pools": {
      get: {
        summary: "List candidate pools owned by the current user",
        responses: {
          "200": {
            description: "Pool collection",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PoolListResponse" }
              }
            }
          }
        }
      },
      post: {
        summary: "Create a candidate pool, optionally seeded from extracted source material",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PoolCreateRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Pool created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PoolCreateResponse" }
              }
            }
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" }
              }
            }
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" }
              }
            }
          },
          "502": {
            description: "Gemini unavailable or invalid response",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" }
              }
            }
          }
        }
      }
    },
    "/api/pools/{poolId}": {
      get: {
        summary: "Fetch a candidate pool",
        parameters: [
          {
            name: "poolId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Pool resource",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PoolDetailResponse" }
              }
            }
          }
        }
      },
      patch: {
        summary: "Update a candidate pool",
        parameters: [
          {
            name: "poolId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Pool updated"
          }
        }
      }
    },
    "/api/pools/{poolId}/candidates": {
      post: {
        summary: "Add candidates to a candidate pool",
        parameters: [
          {
            name: "poolId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Pool membership updated"
          }
        }
      }
    },
    "/api/tournaments": {
      get: {
        summary: "List tournaments visible to the current user",
        responses: {
          "200": {
            description: "Tournament collection"
          }
        }
      },
      post: {
        summary: "Create a draft tournament",
        responses: {
          "201": {
            description: "Tournament created"
          }
        }
      }
    },
    "/api/tournaments/{tournamentId}": {
      get: {
        summary: "Fetch a tournament",
        parameters: [
          {
            name: "tournamentId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Tournament resource"
          }
        }
      },
      patch: {
        summary: "Update tournament settings or lifecycle state",
        parameters: [
          {
            name: "tournamentId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Tournament updated"
          }
        }
      }
    },
    "/api/tournaments/{tournamentId}/entries": {
      get: {
        summary: "List tournament entries",
        parameters: [
          {
            name: "tournamentId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Tournament entries"
          }
        }
      }
    },
    "/api/tournaments/{tournamentId}/invites": {
      get: {
        summary: "List invitees for a friends tournament",
        parameters: [
          {
            name: "tournamentId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Invite collection"
          }
        }
      },
      post: {
        summary: "Create or register invites for a friends tournament",
        parameters: [
          {
            name: "tournamentId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "201": {
            description: "Invite created"
          }
        }
      }
    },
    "/api/tournaments/{tournamentId}/links": {
      get: {
        summary: "List share links for a tournament",
        parameters: [
          {
            name: "tournamentId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Share link collection"
          }
        }
      },
      post: {
        summary: "Create a share link for a draft friends tournament",
        parameters: [
          {
            name: "tournamentId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "201": {
            description: "Share link created"
          }
        }
      }
    },
    "/api/tournaments/{tournamentId}/rounds": {
      get: {
        summary: "List rounds for a tournament",
        parameters: [
          {
            name: "tournamentId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Round collection"
          }
        }
      }
    },
    "/api/tournaments/{tournamentId}/matches": {
      get: {
        summary: "List matches for a tournament",
        parameters: [
          {
            name: "tournamentId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Match collection"
          }
        }
      }
    },
    "/api/rounds/{roundId}": {
      get: {
        summary: "Fetch a round",
        parameters: [
          {
            name: "roundId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Round resource"
          }
        }
      },
      patch: {
        summary: "Update a round",
        parameters: [
          {
            name: "roundId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Round updated"
          }
        }
      }
    },
    "/api/matches/{matchId}": {
      get: {
        summary: "Fetch a match",
        parameters: [
          {
            name: "matchId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Match resource"
          }
        }
      }
    },
    "/api/matches/{matchId}/votes": {
      post: {
        summary: "Submit an immutable vote for a match",
        parameters: [
          {
            name: "matchId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "201": {
            description: "Vote recorded"
          }
        }
      }
    }
  }
};
