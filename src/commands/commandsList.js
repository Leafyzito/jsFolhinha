const fs = require("fs");
const path = require("path");

const commandsList = {};

// Function to reload commands
const loadCommands = () => {
  // Clear existing commandsList
  Object.keys(commandsList).forEach((key) => delete commandsList[key]);

  const commandsMainDir = path.join(__dirname, ".");

  // Get all command directories (folders only)
  const commandDirs = fs.readdirSync(commandsMainDir).filter((item) => {
    const itemPath = path.join(commandsMainDir, item);
    return fs.statSync(itemPath).isDirectory();
  });

  // Process each command directory
  commandDirs.forEach((commandDir) => {
    const commandPath = path.join(commandsMainDir, commandDir);

    // Get all JS files in the command folder
    const commandFiles = fs
      .readdirSync(commandPath)
      .filter((file) => file.endsWith(".js"));

    // Process each JS file
    commandFiles.forEach((file) => {
      const filePath = path.join(commandPath, file);
      const fileModule = require(filePath);

      // Extract commands from the module
      Object.entries(fileModule)
        .filter(([key]) => key.includes("Command"))
        .forEach(([, command]) => {
          // Add main command
          if (command.aliases) {
            // Add all aliases
            command.aliases.forEach((alias) => {
              commandsList[alias] = command;
            });
          }
        });
    });
  });

  console.info(`* Loaded ${Object.keys(commandsList).length} commands`);

  return commandsList;
};

// Export the loadCommands function
module.exports = {
  commandsList,
  loadCommands,
};
