## Contributing to Hyper Files Inspector

Thank you for your interest in contributing! This project helps users inspect and export data from Tableau .hyper files.

## How to Contribute

### 🐛 Reporting Bugs
- Check existing issues first
- Use the bug report template
- Include your OS, Node.js version, and Python version
- Provide sample .hyper files if possible (without sensitive data)

### 💡 Suggesting Features
- Check existing feature requests
- Describe the problem you're trying to solve
- Explain how it would benefit other users

### 🔧 Code Contributions

#### Setup for Development
1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/hyper-files-inspector.git`
3. Install dependencies: `npm run setup`
4. Create a feature branch: `git checkout -b feature/your-feature`

#### Development Guidelines
- **Frontend**: Use vanilla JavaScript (no frameworks to keep it simple)
- **Backend**: Node.js + Express for the web server
- **Python**: Keep the Hyper API integration clean and well-documented
- **Code Style**: Follow existing patterns, use meaningful variable names
- **Testing**: Test with various .hyper file types and sizes

#### Pull Request Process
1. Update README.md if you add new features
2. Test both CLI and web interfaces
3. Ensure all files are properly gitignored
4. Submit PR with clear description of changes

### 🧪 Testing
- Test with different .hyper file structures
- Verify both inspect and export functionality
- Check CLI commands work as documented
- Test web UI on different browsers

### 📝 Documentation
- Update README.md for new features
- Add code comments for complex logic
- Include usage examples

## Development Setup

```bash
# Install Node.js dependencies
npm install

# Set up Python virtual environment and install Tableau Hyper API
pip install tableauhyperapi

# Start development web server
npm run web

# Test CLI commands
npm start
```

## Project Structure

```
hyper-files-inspector/
├── index.js              # CLI interface
├── server.js              # Web server
├── hyper_inspector.py     # Python backend (Hyper API)
├── public/
│   └── index.html         # Web UI
├── package.json           # Node.js config
└── README.md              # Documentation
```

## Questions?

Feel free to open an issue for any questions about contributing!