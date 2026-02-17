# User Story Definition Guide

**Version**: 1.0
**Last Updated**: 2026-02-02
**Status**: Active

Dit document beschrijft de standaarden en criteria voor het schrijven van user stories, epics, acceptatiecriteria en test cases in het Typhoon project, conform Agile best practices.

---

## Hiërarchie

```
Epic (EPIC-XXX)
  └── User Story (US-XXX)
        └── Acceptatiecriteria (AC-XXX)
              └── Test Case (TC-XXX)
```

---

## 1. Epic Definitie

Een Epic is een grote functionaliteit of thema dat meerdere requirements groepeert.

### Template

```markdown
#### EPIC-XXX: [Titel]
**Beschrijving**: [Korte beschrijving van het thema/functionaliteit]
**Business Value**: [Waarom is dit waardevol?]
**Status**: ⬜ Open | 🔄 In Progress | ✅ Complete

**Gekoppelde Requirements**:
- REQ-XXX
- REQ-XXX
```

### Kwaliteitscriteria Epic

| Criterium | Beschrijving |
|-----------|--------------|
| Thematisch | Groepeert gerelateerde requirements |
| Waardevol | Levert duidelijke business value |
| Afgebakend | Heeft een duidelijke scope |
| Splitsbaar | Kan opgedeeld worden in requirements |

### Voorbeeld

```markdown
#### EPIC-001: User Authentication
**Beschrijving**: Implementeer gebruikersauthenticatie met JWT tokens
**Business Value**: Beveiligt de applicatie en maakt gebruiker-specifieke features mogelijk
**Status**: 🔄 In Progress

**Gekoppelde User Stories**:
- US-020: User Registration
- US-021: User Login
- US-022: Password Reset
```

---

## 2. User Story Definitie

Een User Story beschrijft functionaliteit vanuit het perspectief van de gebruiker en volgt het standaard Agile format.

### User Story Format

```
Als <rol/persona>
Wil ik <functionaliteit/doel>
Zodat <business value/reden>
```

**Engels:**
```
As a <role>
I want <goal>
So that <benefit>
```

### Template

```markdown
#### US-XXX: [Korte titel]
**Epic**: EPIC-XXX
**Priority**: High | Medium | Low
**Story Points**: 1 | 2 | 3 | 5 | 8 | 13
**Status**: ⬜ Open | 🔄 In Progress | ✅ Complete | ⏸️ Deferred

**User Story**:
Als [rol]
Wil ik [functionaliteit]
Zodat [business value]

**Afhankelijkheden**:
- [US-XXX of externe afhankelijkheid]

**Acceptatiecriteria**:
- [ ] AC-XXX-01: [Criterium]
- [ ] AC-XXX-02: [Criterium]

**Definition of Done**:
- [ ] Code geschreven en reviewed
- [ ] Unit tests geschreven (coverage ≥ 80%)
- [ ] Acceptatiecriteria geverifieerd
- [ ] Documentatie bijgewerkt
```

### Kwaliteitscriteria User Story (INVEST)

| Criterium | Beschrijving | Check |
|-----------|--------------|-------|
| **I**ndependent | Onafhankelijk van andere stories | Kan deze story los worden opgeleverd? |
| **N**egotiable | Onderhandelbaar, geen contract | Is er ruimte voor discussie over implementatie? |
| **V**aluable | Waardevol voor de gebruiker/business | Levert dit directe waarde op? |
| **E**stimable | In te schatten qua effort | Kan het team story points toekennen? |
| **S**mall | Klein genoeg voor één sprint | Past dit in één sprint? |
| **T**estable | Testbaar met acceptatiecriteria | Kun je verifiëren of het werkt? |

### User Story Checklist

Voordat een User Story wordt goedgekeurd, moet het voldoen aan:

- [ ] Heeft een unieke ID (US-XXX)
- [ ] Gekoppeld aan een Epic
- [ ] Volgt het "Als... Wil ik... Zodat..." format
- [ ] Beschrijft WAT, niet HOE (geen implementatiedetails)
- [ ] Prioriteit is bepaald
- [ ] Story Points zijn geschat
- [ ] Minimaal 2 acceptatiecriteria
- [ ] Voldoet aan INVEST criteria
- [ ] Afhankelijkheden zijn geïdentificeerd
- [ ] Review door Product Owner

### Verboden Woorden in User Stories

Vermijd vage termen die niet testbaar zijn:

| Vermijd | Gebruik in plaats |
|---------|-------------------|
| snel | < 100ms response time |
| gebruiksvriendelijk | voldoet aan WCAG 2.1 AA |
| veilig | encrypted met AES-256 |
| betrouwbaar | 99.9% uptime |
| flexibel | ondersteunt formats X, Y, Z |
| eenvoudig | maximaal 3 klikken |

---

## 3. Acceptatiecriteria Definitie

Acceptatiecriteria (AC) definiëren de voorwaarden waaraan voldaan moet worden om een requirement als "complete" te beschouwen.

### Template

```markdown
**AC-[US-ID]-[NR]**: [Given/When/Then of concrete voorwaarde]
```

### Formaten

#### Format 1: Given/When/Then (Gherkin)

```markdown
AC-001-01:
  Given: een ingelogde gebruiker
  When: de gebruiker klikt op "Logout"
  Then: wordt de sessie beëindigd en redirect naar login pagina
```

#### Format 2: Concrete Voorwaarde

```markdown
AC-001-01: Endpoint retourneert HTTP 200 bij succesvolle request
AC-001-02: Response bevat velden: status, timestamp, version
AC-001-03: Response time is < 100ms bij normale load
```

### Kwaliteitscriteria Acceptatiecriteria

| Criterium | Beschrijving |
|-----------|--------------|
| **Binair** | Resultaat is ja of nee, geen "gedeeltelijk" |
| **Onafhankelijk** | Testbaar zonder andere AC's |
| **Specifiek** | Bevat concrete waarden/grenzen |
| **Verifieerbaar** | Kan geautomatiseerd of handmatig getest worden |

### Voorbeeld

```markdown
#### US-001: Health Check Endpoint
**Epic**: EPIC-001
**Priority**: High
**Story Points**: 3
**Status**: ✅ Complete

**User Story**:
Als DevOps engineer
Wil ik een health check endpoint
Zodat ik de applicatiestatus kan monitoren en load balancers correct kunnen routeren

**Acceptatiecriteria**:
- [x] AC-001-01: Endpoint is bereikbaar op GET /health
- [x] AC-001-02: Retourneert HTTP 200 wanneer applicatie gezond is
- [x] AC-001-03: Response bevat JSON met: status, timestamp, uptime
- [x] AC-001-04: Response time < 100ms onder normale omstandigheden
- [x] AC-001-05: Retourneert HTTP 503 wanneer dependencies falen

**Definition of Done**:
- [x] Code geschreven en reviewed
- [x] Unit tests geschreven (coverage ≥ 80%)
- [x] Acceptatiecriteria geverifieerd
- [x] Documentatie bijgewerkt
```

---

## 4. Test Case Definitie

Test cases verifiëren dat acceptatiecriteria worden nageleefd.

### Template

```markdown
#### TC-[US-ID]-[NR]: [Titel]
**Test Type**: Unit | Integration | E2E | Performance | Security
**User Story**: US-XXX
**Acceptatiecriterium**: AC-XXX-XX
**Priority**: Critical | High | Medium | Low

**Precondities**:
- [Vereiste staat voordat test start]

**Test Stappen**:
1. [Actie]
2. [Actie]
3. [Actie]

**Verwacht Resultaat**:
- [Concrete verwachting]

**Test Data**:
- [Benodigde test data]
```

### Test Types

| Type | Doel | Voorbeeld |
|------|------|-----------|
| **Unit** | Test individuele functie/component | `healthService.getStatus()` returns correct object |
| **Integration** | Test samenwerking componenten | API endpoint calls service en retourneert correct |
| **E2E** | Test complete user flow | User kan inloggen en dashboard zien |
| **Performance** | Test snelheid/load | Endpoint handles 100 req/s < 100ms |
| **Security** | Test beveiliging | SQL injection wordt geblokkeerd |

### Kwaliteitscriteria Test Case

| Criterium | Beschrijving |
|-----------|--------------|
| **Herhaalbaar** | Zelfde input = zelfde output, elke keer |
| **Onafhankelijk** | Geen afhankelijkheid van andere tests |
| **Atomair** | Test één ding per test case |
| **Snel** | Unit tests < 100ms, Integration < 1s |
| **Gedocumenteerd** | Duidelijke stappen en verwachtingen |

### Voorbeeld

```markdown
#### TC-001-01: Health endpoint returns 200 when healthy
**Test Type**: Integration
**Acceptatiecriterium**: AC-001-02
**Priority**: Critical

**Precondities**:
- Applicatie is gestart
- Geen dependency failures

**Test Stappen**:
1. Stuur GET request naar /health
2. Valideer response status code
3. Valideer response body structuur

**Verwacht Resultaat**:
- Status code is 200
- Body bevat { status: "healthy", timestamp: <ISO8601>, uptime: <number> }

**Test Data**:
- Geen specifieke test data nodig
```

---

## 5. Traceability Matrix

Houd een traceability matrix bij om de relaties te documenteren:

| Epic | User Story | Acceptatiecriteria | Test Cases | Status |
|------|------------|-------------------|------------|--------|
| EPIC-001 | US-001 | AC-001-01, AC-001-02 | TC-001-01, TC-001-02 | ✅ |
| EPIC-001 | US-002 | AC-002-01 | TC-002-01 | 🔄 |

---

## 6. Status Definities

| Status | Icoon | Betekenis |
|--------|-------|-----------|
| Open | ⬜ | Nog niet gestart |
| In Progress | 🔄 | Actief in ontwikkeling |
| Complete | ✅ | Voldoet aan alle acceptatiecriteria |
| Deferred | ⏸️ | Uitgesteld naar latere versie |
| Blocked | 🚫 | Geblokkeerd door afhankelijkheid |

---

## 7. Nummering Conventies

| Type | Format | Voorbeeld |
|------|--------|-----------|
| Epic | EPIC-XXX | EPIC-001 |
| User Story | US-XXX | US-015 |
| Acceptatiecriterium | AC-[US]-[NR] | AC-015-01 |
| Test Case | TC-[US]-[NR] | TC-015-01 |

---

## 8. Review Checklist

### User Story Review

- [ ] Volgt "Als... Wil ik... Zodat..." format
- [ ] Voldoet aan INVEST criteria
- [ ] Geen verboden vage woorden
- [ ] Gekoppeld aan Epic
- [ ] Story Points geschat
- [ ] Minimaal 2 acceptatiecriteria
- [ ] Acceptatiecriteria zijn binair testbaar
- [ ] Definition of Done gedefinieerd
- [ ] Afhankelijkheden geïdentificeerd

### Test Case Review

- [ ] Gekoppeld aan User Story en acceptatiecriterium
- [ ] Precondities beschreven
- [ ] Stappen zijn reproduceerbaar
- [ ] Verwacht resultaat is specifiek
- [ ] Test type is correct

---

## Changelog

| Datum | Versie | Wijziging |
|-------|--------|-----------|
| 2026-02-02 | 1.0 | Initiële versie |
