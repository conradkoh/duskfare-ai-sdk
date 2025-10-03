# Text Generation Service - Setup Guide

Step-by-step guide to configure and test the Text Generation Service.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Getting API Keys](#getting-api-keys)
3. [Setting Up Environment Variables](#setting-up-environment-variables)
4. [Running Tests](#running-tests)
5. [Verification](#verification)

## Quick Start

Follow these steps in order:

### 1. Get API Key

#### OpenRouter (Recommended)

✅ **Pros:**

- Free tier with credits
- Access to multiple models (OpenAI, Google Gemini, Anthropic, etc.)
- Simple setup
- Good for testing different providers

**Steps:**

1. Go to [https://openrouter.ai](https://openrouter.ai)
2. Sign up or log in
3. Navigate to [Keys](https://openrouter.ai/keys)
4. Click "Create Key"
5. Copy the key (starts with `sk-or-v1-`)

### 2. Set Environment Variables

#### Using .env.test file (Recommended - Bun Auto-loads!)

Bun automatically loads `.env.test` when running integration tests. Just create the file:

```bash
# Create .env.test file in project root
cat > .env.test << 'EOF'
TEST_OPENROUTER_API_KEY="sk-or-v1-your-key-here"
EOF
```

**That's it!** Bun will automatically load these variables when you run `pnpm test:integration`.

#### Alternative: Manual Export (Not Recommended)

If you prefer to export manually:

**macOS/Linux:**

```bash
export TEST_OPENROUTER_API_KEY="sk-or-v1-your-key-here"
```

**Windows PowerShell:**

```powershell
$env:TEST_OPENROUTER_API_KEY="sk-or-v1-your-key-here"
```

### 3. Verify .env.test File

```bash
# Check if .env.test exists
ls -la .env.test

# View contents (be careful not to expose keys!)
cat .env.test
```

### 4. Run Integration Tests

```bash
# Run integration tests (Bun automatically loads .env.test)
pnpm test:integration

# Or use bun directly
bun test --env-file=.env.test --test-name-pattern integration
```

**Note:** Integration tests use `*.integration.test.ts` naming pattern to distinguish them from unit tests.

## Expected Output

### Without API Keys (Tests Skipped)

```
✓ src/infra/service/text-generation/text-generation-service.integration.test.ts (8 tests | 8 skipped)

╔════════════════════════════════════════════════════════════════════════════╗
║                    Integration Tests Skipped                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Integration tests require API keys to be set as environment variables.
[... setup instructions ...]
```

### With API Keys (Tests Running)

```
✓ src/infra/service/text-generation/text-generation-service.integration.test.ts (8 tests) 15000ms
  ✓ OpenRouter with Gemini 2.0 Flash
    ✓ should generate text successfully
    ✓ should stream text successfully
    ✓ should respect maxTokens configuration
    ✓ should handle stop sequences
  ✓ Google Gemini Direct
    ✓ should generate text with Google Gemini
    ✓ should stream text with Google Gemini
  ✓ Configuration Merging
    ✓ should merge default config with request config
  ✓ Error Handling
    ✓ should handle invalid API key gracefully

Test Files  1 passed (1)
     Tests  8 passed (8)
```

## Verification Checklist

Use this checklist to ensure everything is set up correctly:

- [ ] **API Keys Obtained**

  - [ ] OpenRouter key obtained

- [ ] **Environment Variables Set**

  - [ ] Variable exported in shell or in `.env.test`
  - [ ] Can verify with `echo $TEST_OPENROUTER_API_KEY`
  - [ ] Key is correct (no typos)

- [ ] **Dependencies Installed**

  - [ ] Run `pnpm install`
  - [ ] Verify `@ai-sdk/openai` is installed

- [ ] **Tests Run Successfully**
  - [ ] Unit tests pass: `pnpm test text-generation-service.impl.test.ts`
  - [ ] Integration tests run (not skipped)
  - [ ] All integration tests pass

## Troubleshooting

### Issue: Tests Are Skipped

**Symptoms:**

- See "Integration Tests Skipped" message
- All tests show as skipped

**Solutions:**

1. Verify environment variable is set:

   ```bash
   echo $TEST_OPENROUTER_API_KEY
   ```

2. Re-export variable in current shell:

   ```bash
   export TEST_OPENROUTER_API_KEY="your-key"
   ```

3. Check for typos in variable name (must be exact)

### Issue: "Invalid API Key" Error

**Symptoms:**

- Tests run but fail with authentication error
- Error message about invalid or expired key

**Solutions:**

1. Verify key is copied correctly (no extra spaces)
2. Check key is active on provider website
3. Try generating a new API key
4. Ensure you're using test keys, not production keys

### Issue: Rate Limit Exceeded

**Symptoms:**

- Error message about too many requests
- Tests fail after several runs

**Solutions:**

1. Wait a few minutes before retrying
2. Check your usage on provider dashboard
3. Use different API keys for different test runs
4. Consider upgrading to paid tier if testing frequently

### Issue: Network/Connection Errors

**Symptoms:**

- Timeout errors
- Connection refused
- DNS resolution failures

**Solutions:**

1. Check internet connection
2. Verify no firewall blocking requests
3. Check if VPN is interfering
4. Try again later (provider might be down)
5. Check provider status page

### Issue: Tests Pass But No Output

**Symptoms:**

- Tests marked as passing
- No console.log output showing results

**Solutions:**

1. This is normal - console.log only shows when tests run
2. To see output, add `--reporter=verbose`:
   ```bash
   pnpm test text-generation-service.integration.test.ts --reporter=verbose
   ```

## Cost Management

### Expected Costs

With proper configuration:

- **Free tier usage**: Tests use ~50 tokens per test
- **8 tests total**: ~400 tokens per full run
- **Gemini 2.0 Flash**: Free tier covers thousands of requests
- **Estimated cost**: $0.00 for normal testing (within free tier)

### Monitoring Usage

**OpenRouter:**

- Dashboard: [https://openrouter.ai/activity](https://openrouter.ai/activity)
- Shows detailed usage and costs
- Free tier balance visible

**Google AI:**

- Usage: [https://aistudio.google.com/app/usage](https://aistudio.google.com/app/usage)
- Daily quota and limits
- Request count and token usage

### Tips to Minimize Costs

1. ✅ Tests already use `maxTokens: 50` (very low)
2. ✅ Use free tier providers (OpenRouter, Google)
3. ✅ Run tests only when needed (not on every save)
4. ✅ Skip integration tests in CI for frequent commits
5. ✅ Use short, focused prompts

## CI/CD Setup

### GitHub Actions

Add API keys to repository secrets:

1. Go to repo Settings → Secrets and variables → Actions
2. Add secret:

   - Name: `TEST_OPENROUTER_API_KEY`
   - Value: your OpenRouter key

3. Use in workflow:
   ```yaml
   - name: Run Integration Tests
     env:
       TEST_OPENROUTER_API_KEY: ${{ secrets.TEST_OPENROUTER_API_KEY }}
     run: pnpm test text-generation-service.integration.test.ts
   ```

### GitLab CI

Add variable in Settings → CI/CD → Variables:

- `TEST_OPENROUTER_API_KEY`

It will be automatically available as an environment variable.

## Next Steps

After successful setup:

1. ✅ **Read the docs**: Check [README.md](./README.md) for usage examples
2. ✅ **Review tests**: Look at integration test file for patterns
3. ✅ **Try examples**: Run code from [examples.ts](./examples.ts)
4. ✅ **Build your app**: Start integrating the service

## Additional Resources

- [Service README](./README.md)
- [OpenRouter Docs](https://openrouter.ai/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

## Support

Having issues? Check these in order:

1. This SETUP.md guide
2. [README.md](./README.md) for general usage
3. Provider documentation (links above)
4. Open an issue with:
   - Error message (redact API keys!)
   - Steps to reproduce
   - Environment (OS, Node version, etc.)

---

**Security Reminder:** Never commit API keys to version control! Always use environment variables or secrets management.
