# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive testing infrastructure with Vitest
- ESLint for code linting and quality checks
- Prettier for consistent code formatting
- TypeScript definitions (cd48.d.ts) for better IDE support
- JSDoc documentation generation
- CI workflow for automated testing and linting
- Release automation workflow
- CONTRIBUTING.md with development guidelines
- CODE_OF_CONDUCT.md for community standards
- Multiple example applications:
  - Error handling example
  - Data export example (CSV/JSON)
  - Continuous monitoring example
  - Demo mode example
- GitHub issue templates
- Pull request template
- Content Security Policy headers in web interface
- `.gitignore` file for better repository management

### Changed

- Updated package.json with npm publishing configuration
- Improved README.md with better documentation
- Enhanced web interface with security improvements

### Fixed

- Various code quality improvements based on linting rules

## [0.1.0] - 2024-XX-XX

### Added

- Initial release
- CD48 JavaScript library (cd48.js)
- Web-based control interface (index.html)
- Web Serial API integration
- Full device control:
  - Read counts from all 8 channels
  - Configure trigger levels
  - Set input impedance (50Ω / High-Z)
  - Configure DAC output
  - Channel configuration
  - LED testing
- High-level measurement functions:
  - Rate measurements
  - Coincidence measurements with accidental correction
- Example applications:
  - Simple monitor
  - Coincidence measurement
- GitHub Pages deployment
- MIT License
- README.md with comprehensive documentation

[Unreleased]: https://github.com/OpenPhysics/jscd48-tmp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/OpenPhysics/jscd48-tmp/releases/tag/v0.1.0
