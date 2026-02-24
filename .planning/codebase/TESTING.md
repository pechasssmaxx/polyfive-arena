# Testing Patterns

**Analysis Date:** 2026-02-23

## Test Framework

**Runner:**
- Vitest 3.2.4
- Config: `vitest.config.ts`

**Assertion Library:**
- Testing Library React 16.0.0
- Testing Library Jest DOM 6.6.0

**Run Commands:**
```bash
npm run test              # Run all tests (vitest run)
npm run test:watch       # Watch mode (vitest)
```

**Configuration (`vitest.config.ts`):**
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

**Key Configuration Details:**
- `environment: "jsdom"` — Browser-like environment for component testing
- `globals: true` — Vitest globals available without imports (describe, it, expect)
- `setupFiles: ["./src/test/setup.ts"]` — Test setup file configured but not present (likely needs to be created)
- Test file patterns: `**/*.{test,spec}.{ts,tsx}`
- Path alias `@` configured matching source code

## Test File Organization

**Location:**
- Test files co-located with source files (implied by test glob pattern `src/**/*.{test,spec}.{ts,tsx}`)
- Dedicated setup file path configured: `src/test/setup.ts` (not yet created)

**Naming:**
- Pattern: `.test.ts`, `.test.tsx`, `.spec.ts`, `.spec.tsx`
- Examples not found in codebase (no tests currently present)

**Current Status:**
- No test files present in codebase
- Test directory `/src/test/` exists but is empty (no setup file)
- Testing infrastructure configured but unused

## Test Structure

**Setup Files:**
Path `src/test/setup.ts` is referenced in config but does not exist. This file should contain:
- Global test setup (e.g., mocking fetch, localStorage)
- Custom matchers if using Testing Library
- Provider setup (QueryClient, themes, etc.)

**Example anticipated pattern (based on dependencies):**
```typescript
// src/test/setup.ts (not currently present)
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Global setup would go here
```

## Mocking

**Framework:**
- Vitest native mocking (no external library detected in config)
- Can use `vi.mock()` for module mocking

**Fixtures and Factories:**
- None currently implemented
- Could be placed in `src/test/fixtures/` or `src/test/factories/`

**What to Mock:**
- External API calls (fetch via mocking)
- Components that require specific context
- Event streams (EventSource from `Index.tsx`)

**What NOT to Mock:**
- React hooks from react or testing-library
- Component rendering behavior
- Actual component logic unless testing error states

## Coverage

**Requirements:** Not enforced (no coverage configuration in vitest.config.ts)

**View Coverage:**
Coverage command not configured. To enable:
```bash
npm run test -- --coverage
```

## Test Types

**Unit Tests:**
- Scope: Individual utility functions and component rendering
- Approach: Vitest + React Testing Library
- Example targets:
  - `formatTimeRemaining()` in `src/components/ActivePositions.tsx`
  - `getAnalysis()` deterministic function
  - Utility formatters

**Integration Tests:**
- Scope: Component interaction with hooks and state
- Approach: Render component with QueryClient provider, test state updates
- Example targets:
  - `Index.tsx` REST polling and SSE connection
  - Component tab switching and filtering
  - Model selection state management

**E2E Tests:**
- Framework: Not configured or implemented
- Would need separate setup (Cypress, Playwright, etc.)

## Common Testing Patterns (Not Yet Implemented)

**Async Testing:**
Vitest supports async tests natively:
```typescript
it('fetches data', async () => {
  const { getByText } = render(<Component />);
  await waitFor(() => {
    expect(getByText('Loaded')).toBeInTheDocument();
  });
});
```

**Error Testing:**
Should test Error Boundary:
```typescript
it('catches errors in child component', () => {
  const ThrowError = () => { throw new Error('Test error'); };
  const { getByText } = render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );
  expect(getByText('Something went wrong')).toBeInTheDocument();
});
```

**Provider Testing:**
Components using QueryClient need provider:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();
render(
  <QueryClientProvider client={queryClient}>
    <YourComponent />
  </QueryClientProvider>
);
```

## Critical Testing Gaps

1. **No test setup file created** — `src/test/setup.ts` configured but missing
2. **No test files present** — No `.test.ts` or `.spec.tsx` files in codebase
3. **No coverage enforced** — No minimum coverage threshold
4. **No E2E tests** — No testing for full user flows
5. **Event Stream testing** — SSE connection in `Index.tsx` has no test coverage
6. **REST API mocking** — Fetch calls in polling logic need mock setup
7. **Component interaction** — Tab switching, filtering, selection state not tested

## Recommended Next Steps

1. Create `src/test/setup.ts` with:
   - Testing Library jest-dom matchers
   - QueryClient mock provider
   - Fetch mock setup
   - EventSource mock setup

2. Add test scripts to package.json:
   ```json
   "test:coverage": "vitest --coverage",
   "test:ui": "vitest --ui"
   ```

3. Create test files starting with:
   - `src/components/ErrorBoundary.test.tsx`
   - `src/components/ActivePositions.test.tsx`
   - `src/lib/utils.test.ts`

---

*Testing analysis: 2026-02-23*
