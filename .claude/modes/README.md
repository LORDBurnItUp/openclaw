# Claude Code Sub-Agent Modes

This directory contains **100 specialized sub-agent configurations** for different development domains.

## Usage

Each sub-agent mode can be activated to provide specialized assistance for that domain. Access them in `.claude/modes/[category]/[agent].md`

## Categories (100 Total)

### Frontend (22 agents)
| Agent | Description |
|-------|-------------|
| [react-expert](./frontend/react-expert.md) | React, hooks, Next.js |
| [vue-expert](./frontend/vue-expert.md) | Vue 3, Composition API |
| [angular](./frontend/angular.md) | Angular framework |
| [svelte](./frontend/svelte.md) | Svelte/SvelteKit |
| [nextjs](./frontend/nextjs.md) | Next.js development |
| [nuxt](./frontend/nuxt.md) | Nuxt.js development |
| [tailwindcss](./frontend/tailwindcss.md) | Tailwind CSS |
| [typescript](./frontend/typescript.md) | TypeScript |
| [javascript](./frontend/javascript.md) | JavaScript |
| [css-specialist](./frontend/css-specialist.md) | CSS architecture |
| [web-components](./frontend/web-components.md) | Web Components |
| [accessibility](./frontend/accessibility.md) | A11y best practices |
| [animation](./frontend/animation.md) | UI animations |
| [performance](./frontend/performance.md) | Frontend performance |
| [testing](./frontend/testing.md) | Frontend testing |
| [state-management](./frontend/state-management.md) | State patterns |
| [forms](./frontend/forms.md) | Form handling |
| [graphql-client](./frontend/graphql-client.md) | GraphQL clients |
| [rest-client](./frontend/rest-client.md) | REST API clients |
| [responsive-design](./frontend/responsive-design.md) | Responsive layouts |
| [pwa](./frontend/pwa.md) | Progressive Web Apps |
| [bundle-optimization](./frontend/bundle-optimization.md) | Bundle analysis |

### Backend (22 agents)
| Agent | Description |
|-------|-------------|
| [nodejs](./backend/nodejs.md) | Node.js runtime |
| [python](./backend/python.md) | Python development |
| [go](./backend/go.md) | Go/Golang |
| [rust](./backend/rust.md) | Rust programming |
| [java](./backend/java.md) | Java development |
| [csharp](./backend/csharp.md) | C#/.NET development |
| [php](./backend/php.md) | PHP development |
| [ruby](./backend/ruby.md) | Ruby development |
| [express](./backend/express.md) | Express.js |
| [fastapi](./backend/fastapi.md) | FastAPI Python |
| [django](./backend/django.md) | Django framework |
| [spring-boot](./backend/spring-boot.md) | Spring Boot |
| [rails](./backend/rails.md) | Ruby on Rails |
| [laravel](./backend/laravel.md) | Laravel PHP |
| [dotnet](./backend/dotnet.md) | .NET development |
| [graphql-api](./backend/graphql-api.md) | GraphQL APIs |
| [restful-api](./backend/restful-api.md) | REST APIs |
| [microservices](./backend/microservices.md) | Microservices |
| [auth](./backend/auth.md) | Authentication |
| [api-design](./backend/api-design.md) | API design |

### DevOps (15 agents)
| Agent | Description |
|-------|-------------|
| [docker](./devops/docker.md) | Docker containers |
| [kubernetes](./devops/kubernetes.md) | K8s orchestration |
| [aws](./devops/aws.md) | AWS services |
| [gcp](./devops/gcp.md) | Google Cloud |
| [azure](./devops/azure.md) | Microsoft Azure |
| [terraform](./devops/terraform.md) | Terraform IaC |
| [ansible](./devops/ansible.md) | Ansible automation |
| [jenkins](./devops/jenkins.md) | Jenkins CI/CD |
| [github-actions](./devops/github-actions.md) | GitHub Actions |
| [gitlab-ci](./devops/gitlab-ci.md) | GitLab CI |
| [circleci](./devops/circleci.md) | CircleCI |
| [monitoring](./devops/monitoring.md) | Observability |
| [logging](./devops/logging.md) | Log management |
| [cicd](./devops/cicd.md) | CI/CD pipelines |
| [infrastructure](./devops/infrastructure.md) | Infra management |

### Database (10 agents)
| Agent | Description |
|-------|-------------|
| [postgresql](./database/postgresql.md) | PostgreSQL |
| [mysql](./database/mysql.md) | MySQL/MariaDB |
| [mongodb](./database/mongodb.md) | MongoDB |
| [redis](./database/redis.md) | Redis cache |
| [elasticsearch](./database/elasticsearch.md) | Elasticsearch |
| [dynamodb](./database/dynamodb.md) | DynamoDB |
| [sqlite](./database/sqlite.md) | SQLite |
| [data-modeling](./database/data-modeling.md) | Data modeling |
| [query-optimization](./database/query-optimization.md) | SQL optimization |
| [migration](./database/migration.md) | DB migrations |

### Security (10 agents)
| Agent | Description |
|-------|-------------|
| [owasp](./security/owasp.md) | OWASP Top 10 |
| [penetration-testing](./security/penetration-testing.md) | Pentesting |
| [encryption](./security/encryption.md) | Cryptography |
| [authentication](./security/authentication.md) | Auth systems |
| [authorization](./security/authorization.md) | Access control |
| [secure-coding](./security/secure-coding.md) | Secure practices |
| [vulnerability-assessment](./security/vulnerability-assessment.md) | Vuln scanning |
| [incident-response](./security/incident-response.md) | Incident handling |
| [compliance](./security/compliance.md) | Compliance |
| [appsec](./security/appsec.md) | App security |

### AI/ML (10 agents)
| Agent | Description |
|-------|-------------|
| [python-ml](./ai-ml/python-ml.md) | Python ML |
| [tensorflow](./ai-ml/tensorflow.md) | TensorFlow |
| [pytorch](./ai-ml/pytorch.md) | PyTorch |
| [scikit-learn](./ai-ml/scikit-learn.md) | Scikit-learn |
| [nlp](./ai-ml/nlp.md) | NLP processing |
| [computer-vision](./ai-ml/computer-vision.md) | Computer Vision |
| [llm](./ai-ml/llm.md) | LLMs |
| [prompt-engineering](./ai-ml/prompt-engineering.md) | Prompt engineering |
| [mlops](./ai-ml/mlops.md) | MLOps |
| [data-science](./ai-ml/data-science.md) | Data science |

### Mobile (10 agents)
| Agent | Description |
|-------|-------------|
| [react-native](./mobile/react-native.md) | React Native |
| [flutter](./mobile/flutter.md) | Flutter |
| [swift](./mobile/swift.md) | Swift iOS |
| [kotlin](./mobile/kotlin.md) | Kotlin Android |
| [ios-development](./mobile/ios-development.md) | iOS development |
| [android-development](./mobile/android-development.md) | Android dev |
| [mobile-ui](./mobile/mobile-ui.md) | Mobile UI design |
| [mobile-performance](./mobile/mobile-performance.md) | Mobile perf |
| [app-store](./mobile/app-store.md) | App store deploy |
| [push-notifications](./mobile/push-notifications.md) | Push notifications |

### General (6 agents)
| Agent | Description |
|-------|-------------|
| [git](./general/git.md) | Git version control |
| [linux](./general/linux.md) | Linux systems |
| [bash](./general/bash.md) | Bash scripting |
| [debugging](./general/debugging.md) | Debugging techniques |
| [refactoring](./general/refactoring.md) | Code refactoring |

---

**Total: 103 files (100 specialized agents + README + react-expert + vue-expert)**
