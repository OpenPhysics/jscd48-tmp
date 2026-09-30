> **Archived.** This repository is no longer maintained; please contribute to [tscd48](https://github.com/OpenPhysics/tscd48) instead.

# Contributing to jscd48

Thank you for your interest in contributing to jscd48! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Please be respectful and constructive in issues, pull requests, and reviews.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A modern browser (Chrome 89+, Edge 89+, or Opera 76+) for testing
- Git for version control
- (Optional) A CD48 Coincidence Counter device for hardware testing

### Setting Up the Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/YOUR-USERNAME/jscd48.git
   cd jscd48
   ```

3. **Add the upstream repository**:

   ```bash
   git remote add upstream https://github.com/OpenPhysics/jscd48.git
   ```

4. **Install dependencies**:

   ```bash
   npm install
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

### Git Hooks

This project uses [Husky](https://typicode.github.io/husky/) to enforce code quality through Git hooks. When you run `npm install`, the following hooks are automatically set up:

#### Pre-commit Hook

Runs **before** each commit to ensure code quality:

- ✅ Lints JavaScript files with ESLint (auto-fixes issues)
- ✅ Formats all files with Prettier
- ✅ Only checks staged files (via lint-staged)

If any check fails, the commit will be aborted. Fix the issues and try again.

#### Commit Message Hook

Validates commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):

- Must start with a type: `feat:`, `fix:`, `docs:`, etc.
- Subject must be lowercase
- Maximum header length: 100 characters

**Valid examples:**

```bash
git commit -m "feat: add support for custom baud rates"
git commit -m "fix: resolve count parsing issue"
git commit -m "docs: update installation guide"
```

**Invalid examples:**

```bash
git commit -m "Added feature"           # Missing type
git commit -m "Feat: Add feature"       # Subject not lowercase
git commit -m "fix."                    # Ends with period
```

#### Pre-push Hook

Runs **before** pushing to remote:

- ✅ Runs all tests with `npm test`
- ✅ Ensures tests pass before pushing

If tests fail, the push will be aborted.

#### Using Commitizen (Optional)

For an interactive commit experience:

```bash
npm run commit
```

This launches an interactive prompt to help you write proper commit messages.

#### Bypassing Hooks (Not Recommended)

If you absolutely need to bypass hooks (e.g., work in progress):

```bash
git commit --no-verify -m "wip: work in progress"
git push --no-verify
```

⚠️ **Warning:** Only use this for temporary commits. All commits to main must pass hook checks.

## Development Workflow

### Making Changes

1. **Create a new branch** for your feature or fix:

   ```bash
   git checkout -b feature/my-new-feature
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes** following our coding standards (see below)

3. **Test your changes**:

   ```bash
   npm test                # Run tests
   npm run test:coverage   # Check coverage
   npm run lint            # Lint code
   npm run format:check    # Check formatting
   ```

4. **Format your code**:

   ```bash
   npm run format
   ```

5. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   # or
   git commit -m "fix: resolve issue with..."
   ```

### Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Examples:**

```
feat: add support for custom baud rates
fix: correct count parsing for overflow conditions
docs: update API reference for setTriggerLevel
test: add tests for coincidence rate calculations
```

### Submitting a Pull Request

1. **Push to your fork**:

   ```bash
   git push origin feature/my-new-feature
   ```

2. **Create a pull request** on GitHub

3. **Ensure all checks pass**:
   - CI tests
   - Code formatting
   - Linting
   - Test coverage

4. **Respond to review feedback** and make requested changes

5. **Once approved**, a maintainer will merge your PR

## Coding Standards

### JavaScript Style

- Use ES6+ features
- Follow the ESLint configuration (`.eslintrc.json`)
- Use Prettier for formatting (`.prettierrc.json`)
- Use single quotes for strings
- Use semicolons
- Maximum line length: 80 characters

### Code Quality

- Write clear, self-documenting code
- Add comments for complex logic
- Keep functions small and focused
- Avoid deep nesting (max 3 levels)
- Use descriptive variable and function names

### Documentation

- Add JSDoc comments for all public methods
- Include parameter types and return types
- Provide usage examples for new features
- Update README.md if adding features
- Update TypeScript definitions (cd48.d.ts)

**Example:**

```javascript
/**
 * Measure count rate on a channel.
 * @param {number} channel - Channel number (0-7)
 * @param {number} duration - Measurement duration in seconds
 * @returns {Promise<Object>} Rate measurement result
 */
async measureRate(channel = 0, duration = 1.0) {
  // Implementation
}
```

### Testing

- Write tests for all new features
- Maintain or improve code coverage (target: >80%)
- Test both success and error cases
- Use descriptive test names

**Example:**

```javascript
describe('measureRate', () => {
  it('should calculate rate correctly for valid channel', async () => {
    // Test implementation
  });

  it('should throw error for invalid channel number', async () => {
    // Test implementation
  });
});
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in UI mode
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm test -- --watch
```

### Writing Tests

- Place tests in `tests/unit/` directory
- Name test files `*.test.js`
- Mock external dependencies (Web Serial API, etc.)
- Test edge cases and error conditions

## Project Structure

```
jscd48/
├── cd48.js              # Main library
├── cd48.d.ts            # TypeScript definitions
├── index.html           # Web interface
├── examples/            # Example applications
├── tests/               # Test files
│   └── unit/           # Unit tests
├── .github/            # GitHub workflows
│   └── workflows/      # CI/CD workflows
├── docs/               # Generated documentation
└── package.json        # Project configuration
```

## Adding New Features

### For Library Features (cd48.js)

1. Add the method to the `CD48` class
2. Add JSDoc documentation
3. Update TypeScript definitions (cd48.d.ts)
4. Add tests in `tests/unit/cd48.test.js`
5. Update README.md with usage examples
6. Add example usage in `examples/` if applicable

### For Web Interface Features

1. Update `index.html` with new UI elements
2. Test in Chrome, Edge, and Opera
3. Ensure responsive design
4. Update documentation

### For Examples

1. Create new HTML file in `examples/`
2. Include clear comments
3. Test thoroughly
4. Update README.md to reference the example

## Bug Reports

When reporting bugs, please include:

1. **Description** - Clear description of the issue
2. **Steps to reproduce** - Detailed steps to recreate the bug
3. **Expected behavior** - What should happen
4. **Actual behavior** - What actually happens
5. **Environment**:
   - Browser and version
   - Operating system
   - jscd48 version
   - CD48 firmware version (if applicable)
6. **Screenshots** - If applicable
7. **Error messages** - Full error messages and stack traces

## Feature Requests

For feature requests, please include:

1. **Description** - Clear description of the feature
2. **Use case** - Why this feature would be useful
3. **Proposed solution** - How you envision it working
4. **Alternatives** - Other solutions you've considered
5. **Examples** - Code examples or mockups if applicable

## Questions?

- Open an issue for general questions
- Check existing issues and documentation first
- Be respectful and patient

## License

By contributing to jscd48, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:

- GitHub contributors list
- Release notes for significant contributions

Thank you for contributing to jscd48!
