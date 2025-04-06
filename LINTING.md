# Linting and Formatting Setup

This project uses ESLint and Prettier for code quality and consistent formatting.

## Setup in VSCode

1. Install the following VSCode extensions:

   - ESLint: `dbaeumer.vscode-eslint`
   - Prettier: `esbenp.prettier-vscode`

2. VSCode settings have been configured in `.vscode/settings.json` to:
   - Format files on save
   - Apply ESLint fixes on save
   - Use Prettier as the default formatter

## Available Scripts

```bash
# Check for linting issues
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format all files with Prettier
npm run format

# Check if files are formatted correctly
npm run format:check
```

## Configuration Files

- `.eslintrc.cjs` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `.prettierignore` - Files to be ignored by Prettier

## Integration with VS Code

The repository includes a `.vscode/settings.json` file that configures VS Code to:

1. Format on save with Prettier
2. Apply ESLint fixes on save
3. Configure default formatters for different file types

## Pre-commit Hooks (Optional Future Enhancement)

To ensure code quality before commits, consider adding pre-commit hooks using Husky and lint-staged.
