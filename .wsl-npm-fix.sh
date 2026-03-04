#!/bin/bash
# Add npm-global to PATH if not already present
if ! grep -q 'npm-global/bin' ~/.bashrc 2>/dev/null; then
  echo '' >> ~/.bashrc
  echo '# npm global packages (user installs)' >> ~/.bashrc
  echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc
  echo "Added ~/.npm-global/bin to PATH in ~/.bashrc"
fi

# Install agent-browser to user dir (no sudo needed)
export PATH="$HOME/.npm-global/bin:$PATH"
echo "Installing agent-browser..."
npm install -g agent-browser
echo "Done. Run 'source ~/.bashrc' or open new terminal, then: agent-browser install"
