const uuidPathParameter = {
  name: "id",
  in: "path",
  required: true,
  schema: {
    type: "string",
    format: "uuid"
  }
};

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Brackeroni API",
    version: "0.2.0",
    description:
      "Resource-oriented REST contract for Brackeroni. Paths use nouns, state transitions are represented through resource updates or sub-resource creation, and payloads include HAL-style _links metadata. Protected endpoints use the site session cookie; local development also supports x-dev-user-email."
  },
  servers: [],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
        description:
          "Browser session cookie from signing in on this site. In production or secure deployments the cookie name may use the __Secure- prefix."
      },
      devUserEmail: {
        type: "apiKey",
        in: "header",
        name: "x-dev-user-email",
        description: "Local development auth shim."
      }
    },
    parameters: {
      candidateId: {
        ...uuidPathParameter,
        name: "candidateId"
      },
      poolId: {
        ...uuidPathParameter,
        name: "poolId"
      },
      bracketId: {
        ...uuidPathParameter,
        name: "bracketId"
      },
      roundId: {
        ...uuidPathParameter,
        name: "roundId"
      },
      matchId: {
        ...uuidPathParameter,
        name: "matchId"
      },
      parallelBracketId: {
        ...uuidPathParameter,
        name: "parallelBracketId"
      },
      token: {
        name: "token",
        in: "path",
        required: true,
        schema: {
          type: "string",
          minLength: 8,
          maxLength: 120
        }
      }
    },
    schemas: {
      HalLink: {
        type: "object",
        properties: {
          href: { type: "string" },
          title: { type: "string" },
          type: { type: "string" },
          templated: { type: "boolean" }
        },
        required: ["href"]
      },
      HalLinks: {
        type: "object",
        additionalProperties: {
          oneOf: [
            { $ref: "#/components/schemas/HalLink" },
            {
              type: "array",
              items: { $ref: "#/components/schemas/HalLink" }
            }
          ]
        }
      },
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
          },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["error"]
      },
      MetaCount: {
        type: "object",
        properties: {
          count: { type: "integer", minimum: 0 }
        },
        required: ["count"]
      },
      CandidateSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: ["string", "null"] },
          imageUrl: { type: ["string", "null"], format: "uri" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["id", "name", "description", "imageUrl", "createdAt", "updatedAt"]
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
      CandidateUpdateRequest: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 120 },
          description: { type: ["string", "null"], maxLength: 2000 },
          imageUrl: { type: ["string", "null"], format: "uri", maxLength: 2048 }
        },
        minProperties: 1
      },
      CandidateListResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/CandidateSummary" }
          },
          meta: { $ref: "#/components/schemas/MetaCount" },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["items", "meta"]
      },
      CandidateDetailResponse: {
        type: "object",
        properties: {
          item: { $ref: "#/components/schemas/CandidateSummary" },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["item"]
      },
      PoolCandidate: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: ["string", "null"] },
          imageUrl: { type: ["string", "null"], format: "uri" },
          displayOrder: { type: ["integer", "null"] },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["id", "name", "description", "imageUrl", "displayOrder"]
      },
      PoolSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: ["string", "null"] },
          visibility: {
            type: "string",
            enum: ["private", "public_listed", "public_unlisted"]
          },
          archivedAt: { type: ["string", "null"], format: "date-time" },
          candidateCount: { type: "integer", minimum: 0 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: [
          "id",
          "name",
          "description",
          "candidateCount",
          "createdAt",
          "updatedAt"
        ]
      },
      PoolDetail: {
        allOf: [
          { $ref: "#/components/schemas/PoolSummary" },
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
          sourceUrl: { type: ["string", "null"], format: "uri", maxLength: 2048 },
          tags: {
            type: "array",
            maxItems: 12,
            items: { type: "string", minLength: 1, maxLength: 120 }
          }
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
          visibility: {
            type: "string",
            enum: ["private", "public_listed", "public_unlisted"],
            default: "private"
          },
          source: {
            oneOf: [
              { $ref: "#/components/schemas/PoolSourceExtract" },
              { $ref: "#/components/schemas/PoolSourceItems" }
            ]
          }
        },
        required: ["name"]
      },
      PoolImportRequest: {
        oneOf: [
          {
            type: "object",
            properties: {
              sourcePoolId: { type: "string", format: "uuid" }
            },
            required: ["sourcePoolId"]
          },
          {
            type: "object",
            properties: {
              source: {
                oneOf: [
                  { $ref: "#/components/schemas/PoolSourceExtract" },
                  { $ref: "#/components/schemas/PoolSourceItems" }
                ]
              }
            },
            required: ["source"]
          }
        ]
      },
      PoolCandidateGenerationRequest: {
        type: "object",
        properties: {
          count: { type: "integer", minimum: 1, maximum: 100 },
          includeImages: { type: "boolean", default: true },
          prompt: { type: "string", minLength: 1, maxLength: 12000 },
          model: { type: "string", maxLength: 120 }
        },
        required: ["count", "prompt"]
      },
      PoolUpdateRequest: {
        anyOf: [
          {
            type: "object",
            properties: {
              name: { type: "string", minLength: 1, maxLength: 120 },
              description: { type: ["string", "null"], maxLength: 2000 },
              visibility: {
                type: "string",
                enum: ["private", "public_listed", "public_unlisted"]
              }
            },
            minProperties: 1
          },
          {
            type: "object",
            properties: {
              enrichFromSourceUrls: { type: "boolean", const: true }
            },
            required: ["enrichFromSourceUrls"]
          },
          {
            type: "object",
            properties: {
              removeTag: { type: "string", minLength: 1, maxLength: 120 }
            },
            required: ["removeTag"]
          },
          {
            type: "object",
            properties: {
              removeTagsAtOrBelowCount: { type: "integer", minimum: 1, maximum: 999 }
            },
            required: ["removeTagsAtOrBelowCount"]
          }
        ]
      },
      PoolCandidateAttachRequest: {
        type: "object",
        properties: {
          candidateIds: {
            type: "array",
            minItems: 1,
            maxItems: 200,
            items: { type: "string", format: "uuid" }
          }
        },
        required: ["candidateIds"]
      },
      PoolCandidateCreateRequest: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 120 },
          description: { type: ["string", "null"], maxLength: 2000 },
          imageUrl: { type: ["string", "null"], format: "uri", maxLength: 2048 }
        },
        required: ["name"]
      },
      PoolListResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/PoolSummary" }
          },
          meta: { $ref: "#/components/schemas/MetaCount" },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["items", "meta"]
      },
      PoolDetailResponse: {
        type: "object",
        properties: {
          item: { $ref: "#/components/schemas/PoolDetail" },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["item"]
      },
      PoolCandidateGenerationResponse: {
        type: "object",
        properties: {
          item: { $ref: "#/components/schemas/PoolDetail" },
          meta: {
            type: "object",
            properties: {
              importedCount: { type: "integer", minimum: 0 },
              skippedCount: { type: "integer", minimum: 0 },
              importedNames: {
                type: "array",
                items: { type: "string" }
              },
              skippedNames: {
                type: "array",
                items: { type: "string" }
              },
              requestedCount: { type: "integer", minimum: 1, maximum: 100 },
              generatedCount: { type: "integer", minimum: 0 },
              generatedImageCount: { type: "integer", minimum: 0 },
              imageCount: { type: "integer", minimum: 0 },
              model: { type: "string" }
            },
            required: [
              "importedCount",
              "skippedCount",
              "importedNames",
              "skippedNames",
              "requestedCount",
              "generatedCount",
              "generatedImageCount",
              "imageCount",
              "model"
            ]
          },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["item", "meta"]
      },
      PoolCandidateListResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/PoolCandidate" }
          },
          meta: { $ref: "#/components/schemas/MetaCount" },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["items", "meta"]
      },
      TournamentEntry: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          seed: { type: "integer", minimum: 1 },
          finalRank: { type: ["integer", "null"], minimum: 1 },
          candidateId: { type: "string", format: "uuid" },
          candidateName: { type: "string" },
          candidateDescription: { type: ["string", "null"] },
          candidateImageUrl: { type: ["string", "null"], format: "uri" }
        },
        required: [
          "id",
          "seed",
          "finalRank",
          "candidateId",
          "candidateName",
          "candidateDescription",
          "candidateImageUrl"
        ]
      },
      TournamentSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: ["string", "null"] },
          sourcePoolId: { type: ["string", "null"], format: "uuid" },
          sourcePoolName: { type: ["string", "null"] },
          sharingMode: { type: "string", enum: ["private", "with_friends"] },
          visibility: {
            type: "string",
            enum: ["private", "public_listed", "public_unlisted"]
          },
          votingAccess: { type: "string", enum: ["signed_in_only", "anyone"] },
          playStyle: { type: "string", enum: ["reseed", "fixed_bracket"] },
          resultMode: {
            type: "string",
            enum: ["winner_only", "full_ranking", "fast_full_rank"]
          },
          tieBreakMode: { type: "string", enum: ["higher_seed_wins", "random"] },
          intentPreset: {
            type: ["string", "null"],
            enum: ["travel_group_decision", null]
          },
          status: { type: "string", enum: ["draft", "active", "complete"] },
          roundClosureMode: {
            type: "string",
            enum: ["manual", "all_votes_received", "automatic_when_settled"]
          },
          lastVoteAt: { type: ["string", "null"], format: "date-time" },
          startedAt: { type: ["string", "null"], format: "date-time" },
          completedAt: { type: ["string", "null"], format: "date-time" },
          archivedAt: { type: ["string", "null"], format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          entryCount: { type: "integer", minimum: 0 },
          winnerEntryId: { type: ["string", "null"], format: "uuid" },
          winnerName: { type: ["string", "null"] },
          winnerSeed: { type: ["integer", "null"], minimum: 1 },
          winnerImageUrl: { type: ["string", "null"], format: "uri" },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: [
          "id",
          "title",
          "description",
          "sharingMode",
          "visibility",
          "votingAccess",
          "playStyle",
          "resultMode",
          "tieBreakMode",
          "status",
          "roundClosureMode",
          "createdAt",
          "updatedAt"
        ]
      },
      TournamentDetail: {
        allOf: [
          { $ref: "#/components/schemas/TournamentSummary" },
          {
            type: "object",
            properties: {
              entries: {
                type: "array",
                items: { $ref: "#/components/schemas/TournamentEntry" }
              }
            },
            required: ["entries"]
          }
        ]
      },
      TournamentCreateRequest: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 120 },
          description: { type: ["string", "null"], maxLength: 2000 },
          sourcePoolId: { type: ["string", "null"], format: "uuid" },
          sharingMode: { type: "string", enum: ["private", "with_friends"] },
          visibility: {
            type: "string",
            enum: ["private", "public_listed", "public_unlisted"],
            default: "private"
          },
          votingAccess: {
            type: "string",
            enum: ["signed_in_only", "anyone"],
            default: "signed_in_only"
          },
          playStyle: { type: "string", enum: ["reseed", "fixed_bracket"] },
          resultMode: {
            type: "string",
            enum: ["winner_only", "full_ranking", "fast_full_rank"]
          },
          tieBreakMode: { type: "string", enum: ["higher_seed_wins", "random"] },
          intentPreset: {
            type: ["string", "null"],
            enum: ["travel_group_decision", null]
          }
        },
        required: ["title", "sharingMode", "playStyle", "resultMode", "tieBreakMode"]
      },
      TournamentUpdateRequest: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 120 },
          description: { type: ["string", "null"], maxLength: 2000 },
          sourcePoolId: { type: ["string", "null"], format: "uuid" },
          sharingMode: { type: "string", enum: ["private", "with_friends"] },
          visibility: {
            type: "string",
            enum: ["private", "public_listed", "public_unlisted"]
          },
          votingAccess: { type: "string", enum: ["signed_in_only", "anyone"] },
          playStyle: { type: "string", enum: ["reseed", "fixed_bracket"] },
          resultMode: {
            type: "string",
            enum: ["winner_only", "full_ranking", "fast_full_rank"]
          },
          tieBreakMode: { type: "string", enum: ["higher_seed_wins", "random"] },
          intentPreset: {
            type: ["string", "null"],
            enum: ["travel_group_decision", null]
          },
          status: { type: "string", enum: ["draft", "active", "complete"] },
          closeCurrentRound: { type: "boolean" },
          syncWithPool: { type: "boolean" }
        },
        minProperties: 1
      },
      TournamentListResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/TournamentSummary" }
          },
          meta: { $ref: "#/components/schemas/MetaCount" },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["items", "meta"]
      },
      TournamentDetailResponse: {
        type: "object",
        properties: {
          item: { $ref: "#/components/schemas/TournamentDetail" },
          meta: {
            type: "object",
            properties: {
              addedEntryCount: { type: "integer", minimum: 0 }
            }
          },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["item"]
      },
      BracketIntentSourcePlan: {
        oneOf: [
          {
            type: "object",
            properties: {
              type: { type: "string", enum: ["existing_owned_pool"] },
              poolId: { type: "string", format: "uuid" }
            },
            required: ["type", "poolId"]
          },
          {
            type: "object",
            properties: {
              type: { type: "string", enum: ["existing_published_pool"] },
              poolId: { type: "string", format: "uuid" }
            },
            required: ["type", "poolId"]
          },
          {
            type: "object",
            properties: {
              type: { type: "string", enum: ["new_pool_from_items"] },
              poolName: { type: "string", minLength: 1, maxLength: 120 },
              candidates: {
                type: "array",
                minItems: 2,
                maxItems: 1000,
                items: { $ref: "#/components/schemas/PoolSourceItem" }
              }
            },
            required: ["type", "poolName", "candidates"]
          },
          {
            type: "object",
            properties: {
              type: { type: "string", enum: ["new_pool_from_generation"] },
              poolName: { type: "string", minLength: 1, maxLength: 120 },
              candidateCount: { type: "integer", minimum: 2, maximum: 100 },
              prompt: { type: "string", minLength: 1, maxLength: 12000 },
              includeImages: { type: "boolean" }
            },
            required: ["type", "poolName", "candidateCount", "prompt", "includeImages"]
          }
        ]
      },
      BracketIntentPlan: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 120 },
          description: { type: ["string", "null"], maxLength: 2000 },
          source: { $ref: "#/components/schemas/BracketIntentSourcePlan" },
          sharingMode: { type: "string", enum: ["private", "with_friends"] },
          visibility: {
            type: "string",
            enum: ["private", "public_listed", "public_unlisted"]
          },
          votingAccess: { type: "string", enum: ["signed_in_only", "anyone"] },
          playStyle: { type: "string", enum: ["reseed", "fixed_bracket"] },
          resultMode: {
            type: "string",
            enum: [
              "winner_only",
              "full_ranking",
              "partial_ranking",
              "fast_full_rank",
              "parallel_full_ranking",
              "parallel_partial_ranking"
            ]
          },
          tieBreakMode: { type: "string", enum: ["higher_seed_wins", "random"] },
          advancementMode: { type: "string", enum: ["vote_winner", "manual_winner"] },
          intentPreset: { type: ["string", "null"] }
        },
        required: [
          "title",
          "description",
          "source",
          "sharingMode",
          "visibility",
          "votingAccess",
          "playStyle",
          "resultMode",
          "tieBreakMode",
          "advancementMode",
          "intentPreset"
        ]
      },
      BracketIntentRequest: {
        type: "object",
        properties: {
          prompt: { type: "string", minLength: 1, maxLength: 12000 },
          action: { type: "string", enum: ["preview", "create"], default: "preview" }
        },
        required: ["prompt"]
      },
      BracketIntentPreviewResponse: {
        type: "object",
        properties: {
          item: { $ref: "#/components/schemas/BracketIntentPlan" },
          meta: {
            type: "object",
            properties: {
              sourceSummary: { type: "string" },
              safety: {
                type: "object",
                properties: {
                  startsAutomatically: { type: "boolean", const: false },
                  publishesAutomatically: { type: "boolean", const: false },
                  createsPrivatePoolByDefault: { type: "boolean", const: true }
                },
                required: [
                  "startsAutomatically",
                  "publishesAutomatically",
                  "createsPrivatePoolByDefault"
                ]
              },
              matchedPools: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    name: { type: "string" },
                    candidateCount: { type: ["integer", "null"], minimum: 0 },
                    visibility: {
                      type: ["string", "null"],
                      enum: ["private", "public_listed", "public_unlisted", null]
                    }
                  },
                  required: ["id", "name"]
                }
              }
            },
            required: ["sourceSummary", "safety", "matchedPools"]
          }
        },
        required: ["item", "meta"]
      },
      BracketIntentCreateResponse: {
        type: "object",
        properties: {
          item: {
            oneOf: [
              { $ref: "#/components/schemas/TournamentDetail" },
              { $ref: "#/components/schemas/ParallelTournamentSummary" }
            ]
          },
          plan: { $ref: "#/components/schemas/BracketIntentPlan" },
          meta: {
            type: "object",
            properties: {
              sourceSummary: { type: "string" },
              startedAutomatically: { type: "boolean", const: false },
              publishedAutomatically: { type: "boolean", const: false }
            },
            required: ["sourceSummary", "startedAutomatically", "publishedAutomatically"]
          }
        },
        required: ["item", "plan", "meta"]
      },
      TournamentEntriesResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/TournamentEntry" }
          },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["items"]
      },
      TournamentEntriesUpdateRequest: {
        type: "object",
        properties: {
          entries: {
            type: "array",
            minItems: 2,
            items: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                seed: { type: "integer", minimum: 1 },
                subSeed: { type: "integer", minimum: 0, default: 0 }
              },
              required: ["id", "seed"]
            }
          },
          seedingStructure: {
            type: "object",
            properties: {
              subBrackets: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    index: { type: "integer", minimum: 0 },
                    name: { type: "string" }
                  },
                  required: ["id", "index", "name"]
                }
              },
              entryBrackets: {
                type: "object",
                additionalProperties: { type: "string" }
              }
            }
          }
        },
        required: ["entries"]
      },
      Match: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          status: { type: "string" },
          resolutionSource: { type: ["string", "null"] },
          winnerEntryId: { type: ["string", "null"], format: "uuid" },
          roundId: { type: "string", format: "uuid" },
          roundNumber: { type: "integer", minimum: 1 },
          rankingTargetRank: { type: ["integer", "null"], minimum: 1 },
          rankingRoundNumber: { type: ["integer", "null"], minimum: 1 },
          leftEntryId: { type: ["string", "null"], format: "uuid" },
          leftSeed: { type: ["integer", "null"], minimum: 1 },
          leftName: { type: ["string", "null"] },
          leftDescription: { type: ["string", "null"] },
          leftImageUrl: { type: ["string", "null"], format: "uri" },
          leftVoteCount: { type: ["integer", "null"], minimum: 0 },
          rightEntryId: { type: ["string", "null"], format: "uuid" },
          rightSeed: { type: ["integer", "null"], minimum: 1 },
          rightName: { type: ["string", "null"] },
          rightDescription: { type: ["string", "null"] },
          rightImageUrl: { type: ["string", "null"], format: "uri" },
          rightVoteCount: { type: ["integer", "null"], minimum: 0 },
          userVoteEntryId: { type: ["string", "null"], format: "uuid" },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["id", "status", "roundId", "roundNumber"]
      },
      MatchListResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/Match" }
          },
          meta: {
            type: "object",
            properties: {
              tournament: { $ref: "#/components/schemas/TournamentSummary" }
            },
            required: ["tournament"]
          },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["items", "meta"]
      },
      VoteCreateRequest: {
        type: "object",
        properties: {
          selectedEntryId: { type: "string", format: "uuid" }
        },
        required: ["selectedEntryId"]
      },
      VoteRecord: {
        type: "object",
        properties: {
          matchId: { type: "string", format: "uuid" },
          selectedEntryId: { type: "string", format: "uuid" },
          migratedAnonymousVote: { type: "boolean" }
        },
        required: ["matchId", "selectedEntryId"]
      },
      VoteCreateResponse: {
        type: "object",
        properties: {
          item: { $ref: "#/components/schemas/VoteRecord" },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["item"]
      },
      Invite: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          status: { type: "string" },
          joinedAt: { type: ["string", "null"], format: "date-time" },
          userId: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          imageUrl: { type: ["string", "null"], format: "uri" },
          openMatchCount: { type: "integer", minimum: 0 },
          votesCast: { type: "integer", minimum: 0 },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["id", "status", "userId", "name", "email", "openMatchCount", "votesCast"]
      },
      InviteListResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/Invite" }
          },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["items"]
      },
      ShareLink: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          token: { type: "string" },
          active: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["id", "token", "active", "createdAt", "updatedAt"]
      },
      ShareLinkListResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/ShareLink" }
          },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["items"]
      },
      ShareLinkCreateRequest: {
        type: "object",
        properties: {
          rotate: {
            type: "boolean",
            description:
              "Compatibility flag. Prefer creating a new share-link resource rather than action flags."
          }
        }
      },
      ShareLinkDetailResponse: {
        type: "object",
        properties: {
          item: { $ref: "#/components/schemas/ShareLink" },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["item"]
      },
      ParallelTournamentParticipant: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: ["string", "null"], format: "uuid" },
          anonymousVoterToken: { type: ["string", "null"] },
          tournamentId: { type: ["string", "null"], format: "uuid" },
          status: { type: "string", enum: ["invited", "active", "complete"] },
          startedAt: { type: ["string", "null"], format: "date-time" },
          completedAt: { type: ["string", "null"], format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          name: { type: ["string", "null"] },
          email: { type: ["string", "null"], format: "email" },
          imageUrl: { type: ["string", "null"], format: "uri" }
        },
        required: ["id", "status", "createdAt", "updatedAt"]
      },
      ParallelTournamentSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          creatorUserId: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: ["string", "null"] },
          sourcePoolId: { type: "string", format: "uuid" },
          sourcePoolName: { type: "string" },
          sharingMode: { type: "string", enum: ["private", "with_friends"] },
          visibility: {
            type: "string",
            enum: ["private", "public_listed", "public_unlisted"]
          },
          votingAccess: { type: "string", enum: ["signed_in_only", "anyone"] },
          tieBreakMode: { type: "string", enum: ["higher_seed_wins", "random"] },
          intentPreset: {
            type: ["string", "null"],
            enum: ["travel_group_decision", null]
          },
          status: { type: "string", enum: ["draft", "active", "complete"] },
          startedAt: { type: ["string", "null"], format: "date-time" },
          completedAt: { type: ["string", "null"], format: "date-time" },
          archivedAt: { type: ["string", "null"], format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          candidateCount: { type: "integer", minimum: 0 },
          participantCount: { type: "integer", minimum: 0 },
          activeParticipantCount: { type: "integer", minimum: 0 },
          completedParticipantCount: { type: "integer", minimum: 0 },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: [
          "id",
          "creatorUserId",
          "title",
          "description",
          "sourcePoolId",
          "sourcePoolName",
          "sharingMode",
          "visibility",
          "votingAccess",
          "tieBreakMode",
          "status",
          "createdAt",
          "updatedAt",
          "candidateCount",
          "participantCount",
          "activeParticipantCount",
          "completedParticipantCount"
        ]
      },
      ParallelTournamentDetailResponse: {
        type: "object",
        properties: {
          item: {
            allOf: [
              { $ref: "#/components/schemas/ParallelTournamentSummary" },
              {
                type: "object",
                properties: {
                  participants: {
                    type: "array",
                    items: { $ref: "#/components/schemas/ParallelTournamentParticipant" }
                  }
                },
                required: ["participants"]
              }
            ]
          },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["item"]
      },
      ParallelTournamentListResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/ParallelTournamentSummary" }
          },
          meta: { $ref: "#/components/schemas/MetaCount" },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["items", "meta"]
      },
      ParallelTournamentCreateRequest: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 120 },
          description: { type: ["string", "null"], maxLength: 2000 },
          sourcePoolId: { type: "string", format: "uuid" },
          sharingMode: { type: "string", enum: ["private", "with_friends"] },
          visibility: {
            type: "string",
            enum: ["private", "public_listed", "public_unlisted"],
            default: "private"
          },
          votingAccess: {
            type: "string",
            enum: ["signed_in_only", "anyone"],
            default: "signed_in_only"
          },
          tieBreakMode: {
            type: "string",
            enum: ["higher_seed_wins", "random"],
            default: "higher_seed_wins"
          },
          intentPreset: {
            type: ["string", "null"],
            enum: ["travel_group_decision", null]
          }
        },
        required: ["title", "sourcePoolId", "sharingMode"]
      },
      ParallelTournamentUpdateRequest: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 120 },
          description: { type: ["string", "null"], maxLength: 2000 },
          sourcePoolId: { type: "string", format: "uuid" },
          sharingMode: { type: "string", enum: ["private", "with_friends"] },
          visibility: {
            type: "string",
            enum: ["private", "public_listed", "public_unlisted"]
          },
          votingAccess: { type: "string", enum: ["signed_in_only", "anyone"] },
          tieBreakMode: { type: "string", enum: ["higher_seed_wins", "random"] },
          intentPreset: {
            type: ["string", "null"],
            enum: ["travel_group_decision", null]
          },
          status: { type: "string", enum: ["draft", "active", "complete"] }
        },
        minProperties: 1
      },
      ParallelTournamentOpenResponse: {
        type: "object",
        properties: {
          item: {
            type: "object",
            properties: {
              bracketId: { type: "string", format: "uuid" }
            },
            required: ["bracketId"]
          },
          _links: { $ref: "#/components/schemas/HalLinks" }
        },
        required: ["item"]
      },
      ImageSuggestion: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          imageUrl: { type: "string", format: "uri" },
          thumbnailUrl: { type: ["string", "null"], format: "uri" },
          creator: { type: ["string", "null"] },
          license: { type: ["string", "null"] },
          source: { type: ["string", "null"] }
        },
        required: ["id", "title", "imageUrl"]
      },
      ImageSuggestionListResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/ImageSuggestion" }
          }
        },
        required: ["items"]
      }
    },
    responses: {
      BadRequest: {
        description: "Validation or request format error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" }
          }
        }
      },
      Unauthorized: {
        description: "Authentication required",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" }
          }
        }
      },
      Forbidden: {
        description: "Authenticated but not allowed",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" }
          }
        }
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" }
          }
        }
      },
      Conflict: {
        description: "Conflict with current resource state",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" }
          }
        }
      },
      NotImplemented: {
        description: "Route exists but is not implemented",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" }
          }
        }
      },
      InternalError: {
        description: "Server error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" }
          }
        }
      }
    }
  },
  security: [{ sessionCookie: [] }, { devUserEmail: [] }],
  paths: {
    "/api/health": {
      get: {
        summary: "Service health",
        security: [],
        responses: {
          "200": {
            description: "Service health"
          }
        }
      }
    },
    "/api/openapi": {
      get: {
        summary: "OpenAPI contract document",
        security: [],
        responses: {
          "200": {
            description: "OpenAPI JSON document",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    openapi: { type: "string" },
                    info: { type: "object" },
                    servers: { type: "array", items: { type: "object" } },
                    paths: { type: "object" },
                    components: { type: "object" }
                  },
                  required: ["openapi", "info", "paths"]
                }
              }
            }
          }
        }
      }
    },
    "/api/image-proxy": {
      get: {
        summary: "Fetch and proxy a remote image",
        parameters: [
          {
            name: "url",
            in: "query",
            required: true,
            schema: { type: "string", format: "uri", maxLength: 2048 }
          }
        ],
        responses: {
          "200": {
            description: "Proxied image bytes",
            content: {
              "image/*": {
                schema: {
                  type: "string",
                  format: "binary"
                }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "502": { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/api/image-suggestions": {
      get: {
        summary: "Suggest candidate images from upstream providers",
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            schema: { type: "string", minLength: 1, maxLength: 200 }
          }
        ],
        responses: {
          "200": {
            description: "Image suggestions",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ImageSuggestionListResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "502": { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/api/pools": {
      get: {
        summary: "List pool resources for the current user",
        responses: {
          "200": {
            description: "Pool collection",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PoolListResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      },
      post: {
        summary: "Create a pool resource",
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
                schema: { $ref: "#/components/schemas/PoolDetailResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "502": { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/api/pools/{poolId}": {
      get: {
        summary: "Fetch a pool resource",
        parameters: [{ $ref: "#/components/parameters/poolId" }],
        responses: {
          "200": {
            description: "Pool resource",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PoolDetailResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      patch: {
        summary: "Update mutable pool fields",
        parameters: [{ $ref: "#/components/parameters/poolId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PoolUpdateRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Pool updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PoolDetailResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      delete: {
        summary: "Archive a pool resource",
        parameters: [{ $ref: "#/components/parameters/poolId" }],
        responses: {
          "200": {
            description: "Pool archived",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { ok: { type: "boolean" } },
                  required: ["ok"]
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/pools/{poolId}/candidates": {
      get: {
        summary: "List candidates in a pool",
        parameters: [{ $ref: "#/components/parameters/poolId" }],
        responses: {
          "200": {
            description: "Pool candidates",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PoolCandidateListResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      post: {
        summary: "Create a candidate in pool or attach existing candidates",
        parameters: [{ $ref: "#/components/parameters/poolId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/PoolCandidateCreateRequest" },
                  { $ref: "#/components/schemas/PoolCandidateAttachRequest" }
                ]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Pool membership updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PoolDetailResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/pools/{poolId}/candidates/{candidateId}": {
      patch: {
        summary: "Update candidate fields in the context of a pool",
        parameters: [
          { $ref: "#/components/parameters/poolId" },
          { $ref: "#/components/parameters/candidateId" }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CandidateUpdateRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Candidate updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CandidateDetailResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      delete: {
        summary: "Remove one candidate from a pool",
        parameters: [
          { $ref: "#/components/parameters/poolId" },
          { $ref: "#/components/parameters/candidateId" }
        ],
        responses: {
          "200": {
            description: "Pool membership updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PoolDetailResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/pools/{poolId}/favorites": {
      post: {
        summary: "Favorite a pool",
        parameters: [{ $ref: "#/components/parameters/poolId" }],
        responses: {
          "201": {
            description: "Pool favorited",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PoolDetailResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/pools/{poolId}/generations": {
      post: {
        summary: "Generate candidates directly into a pool",
        parameters: [{ $ref: "#/components/parameters/poolId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PoolCandidateGenerationRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Generated candidates imported",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PoolCandidateGenerationResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "502": { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/api/pools/{poolId}/imports": {
      post: {
        summary: "Merge one pool into another",
        parameters: [{ $ref: "#/components/parameters/poolId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PoolImportRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Pool merged",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PoolDetailResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/bracket-intents": {
      post: {
        summary: "Preview or create a draft bracket from a natural-language prompt",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BracketIntentRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Prompt interpreted as a bracket creation plan",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BracketIntentPreviewResponse" }
              }
            }
          },
          "201": {
            description: "Draft bracket created from prompt",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BracketIntentCreateResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "409": { $ref: "#/components/responses/Conflict" },
          "502": { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/api/brackets": {
      get: {
        summary: "List bracket resources owned by the current user",
        responses: {
          "200": {
            description: "Bracket collection",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TournamentListResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      },
      post: {
        summary: "Create a bracket resource in draft state",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TournamentCreateRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Bracket created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TournamentDetailResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    },
    "/api/brackets/{bracketId}": {
      get: {
        summary: "Fetch a bracket resource",
        parameters: [{ $ref: "#/components/parameters/bracketId" }],
        responses: {
          "200": {
            description: "Bracket resource",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TournamentDetailResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      patch: {
        summary: "Update bracket state or configuration",
        parameters: [{ $ref: "#/components/parameters/bracketId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TournamentUpdateRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Bracket updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TournamentDetailResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { $ref: "#/components/responses/Conflict" }
        }
      },
      delete: {
        summary: "Archive a bracket resource",
        parameters: [{ $ref: "#/components/parameters/bracketId" }],
        responses: {
          "200": {
            description: "Bracket archived",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { ok: { type: "boolean" } },
                  required: ["ok"]
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/brackets/{bracketId}/entries": {
      get: {
        summary: "List bracket entries",
        parameters: [{ $ref: "#/components/parameters/bracketId" }],
        responses: {
          "200": {
            description: "Bracket entries",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TournamentEntriesResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      patch: {
        summary: "Replace bracket entry order",
        parameters: [{ $ref: "#/components/parameters/bracketId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TournamentEntriesUpdateRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Bracket entries updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TournamentEntriesResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/brackets/{bracketId}/rerun-drafts": {
      post: {
        summary: "Create a rerun bracket from an existing bracket",
        parameters: [{ $ref: "#/components/parameters/bracketId" }],
        responses: {
          "201": {
            description: "Rerun bracket created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TournamentDetailResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/parallel-brackets": {
      get: {
        summary: "List parallel bracket resources for the current user",
        responses: {
          "200": {
            description: "Parallel bracket collection",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ParallelTournamentListResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      },
      post: {
        summary: "Create a parallel bracket resource",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ParallelTournamentCreateRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Parallel bracket created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ParallelTournamentDetailResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/api/parallel-brackets/{parallelBracketId}": {
      get: {
        summary: "Fetch a parallel bracket resource",
        parameters: [{ $ref: "#/components/parameters/parallelBracketId" }],
        responses: {
          "200": {
            description: "Parallel bracket resource",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ParallelTournamentDetailResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      patch: {
        summary: "Update mutable parallel bracket fields",
        parameters: [{ $ref: "#/components/parameters/parallelBracketId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ParallelTournamentUpdateRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Parallel bracket updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ParallelTournamentDetailResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      delete: {
        summary: "Archive a parallel bracket resource",
        parameters: [{ $ref: "#/components/parameters/parallelBracketId" }],
        responses: {
          "200": {
            description: "Parallel bracket archived",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { ok: { type: "boolean" } },
                  required: ["ok"]
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/parallel-brackets/{parallelBracketId}/links": {
      get: {
        summary: "List share-link resources for a parallel bracket",
        parameters: [{ $ref: "#/components/parameters/parallelBracketId" }],
        responses: {
          "200": {
            description: "Parallel share-link collection",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShareLinkListResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      post: {
        summary: "Create a new share-link resource for a parallel bracket",
        parameters: [{ $ref: "#/components/parameters/parallelBracketId" }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ShareLinkCreateRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Parallel share-link created or rotated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShareLinkDetailResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/parallel-brackets/{parallelBracketId}/participants/me": {
      post: {
        summary: "Create or fetch the current caller participant bracket",
        parameters: [{ $ref: "#/components/parameters/parallelBracketId" }],
        responses: {
          "200": {
            description: "Participant bracket opened",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ParallelTournamentOpenResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/brackets/{bracketId}/invites": {
      get: {
        summary: "List invite resources for a friends bracket",
        parameters: [{ $ref: "#/components/parameters/bracketId" }],
        responses: {
          "200": {
            description: "Invite collection",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InviteListResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/brackets/{bracketId}/links": {
      get: {
        summary: "List share-link resources for a bracket",
        parameters: [{ $ref: "#/components/parameters/bracketId" }],
        responses: {
          "200": {
            description: "Share-link collection",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShareLinkListResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      post: {
        summary: "Create a new share-link resource",
        parameters: [{ $ref: "#/components/parameters/bracketId" }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ShareLinkCreateRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Share-link created or rotated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShareLinkDetailResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/brackets/{bracketId}/matches": {
      get: {
        summary: "List match resources for a bracket",
        parameters: [{ $ref: "#/components/parameters/bracketId" }],
        responses: {
          "200": {
            description: "Match collection",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MatchListResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/brackets/{bracketId}/rounds": {
      get: {
        summary: "List round resources for a bracket",
        parameters: [{ $ref: "#/components/parameters/bracketId" }],
        responses: {
          "200": {
            description: "Round collection placeholder",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: {} },
                    meta: { type: "object" }
                  },
                  required: ["items"]
                }
              }
            }
          }
        }
      }
    },
    "/api/rounds/{roundId}": {
      get: {
        summary: "Fetch a round resource",
        parameters: [{ $ref: "#/components/parameters/roundId" }],
        responses: {
          "501": { $ref: "#/components/responses/NotImplemented" }
        }
      },
      patch: {
        summary: "Update a round resource",
        parameters: [{ $ref: "#/components/parameters/roundId" }],
        responses: {
          "501": { $ref: "#/components/responses/NotImplemented" }
        }
      }
    },
    "/api/matches/{matchId}": {
      get: {
        summary: "Fetch a match resource",
        parameters: [{ $ref: "#/components/parameters/matchId" }],
        responses: {
          "501": { $ref: "#/components/responses/NotImplemented" }
        }
      }
    },
    "/api/matches/{matchId}/votes": {
      post: {
        summary: "Create an immutable vote sub-resource on a match",
        parameters: [{ $ref: "#/components/parameters/matchId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VoteCreateRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Vote created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VoteCreateResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { $ref: "#/components/responses/Conflict" }
        }
      }
    },
    "/api/share-links/{token}": {
      get: {
        summary: "Resolve a share-link token to its target resource",
        parameters: [{ $ref: "#/components/parameters/token" }],
        responses: {
          "200": {
            description: "Share-link target resource",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    item: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        token: { type: "string" },
                        targetPath: { type: "string" },
                        _links: { $ref: "#/components/schemas/HalLinks" }
                      },
                      required: ["type"]
                    },
                    _links: { $ref: "#/components/schemas/HalLinks" }
                  },
                  required: ["item"]
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/admin/archive": {
      delete: {
        summary: "Admin purge of archived material",
        responses: {
          "200": {
            description: "Archived material deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    meta: { type: "object", additionalProperties: true }
                  },
                  required: ["ok", "meta"]
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    },
    "/api/admin/pools/{poolId}": {
      patch: {
        summary: "Admin update for a pool",
        parameters: [{ $ref: "#/components/parameters/poolId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  visibility: {
                    type: "string",
                    enum: ["private", "public_listed", "public_unlisted"]
                  },
                  featuredOnHome: { type: "boolean" }
                },
                minProperties: 1
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Pool updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { ok: { type: "boolean" } },
                  required: ["ok"]
                }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      },
      delete: {
        summary: "Admin delete of an archived pool",
        parameters: [{ $ref: "#/components/parameters/poolId" }],
        responses: {
          "200": {
            description: "Pool deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { ok: { type: "boolean" } },
                  required: ["ok"]
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    },
    "/api/admin/brackets/{bracketId}": {
      patch: {
        summary: "Admin update for bracket visibility",
        parameters: [{ $ref: "#/components/parameters/bracketId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  visibility: {
                    type: "string",
                    enum: ["private", "public_listed", "public_unlisted"]
                  }
                },
                required: ["visibility"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Bracket updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { ok: { type: "boolean" } },
                  required: ["ok"]
                }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      },
      delete: {
        summary: "Admin delete of an archived bracket",
        parameters: [{ $ref: "#/components/parameters/bracketId" }],
        responses: {
          "200": {
            description: "Bracket deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { ok: { type: "boolean" } },
                  required: ["ok"]
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    }
  }
};
