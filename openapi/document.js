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
            description: "Candidate collection"
          }
        }
      },
      post: {
        summary: "Create a candidate",
        responses: {
          "201": {
            description: "Candidate created"
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
            description: "Candidate resource"
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
            description: "Candidate updated"
          }
        }
      }
    },
    "/api/pools": {
      get: {
        summary: "List candidate pools owned by the current user",
        responses: {
          "200": {
            description: "Pool collection"
          }
        }
      },
      post: {
        summary: "Create a candidate pool",
        responses: {
          "201": {
            description: "Pool created"
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
            description: "Pool resource"
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
