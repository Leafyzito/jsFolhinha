// Script to generate commands.json for the website
// This gathers command information from all command files and creates a clean JSON file

const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();
const { loadCommands } = require("../src/commands/commandsList.js");

/**
 * Attempts to fix common URL issues
 * @param {string} url - The URL to fix
 * @returns {string} - The fixed URL or original if no fixes needed
 */
function fixCommonUrlIssues(url) {
  if (typeof url !== "string") return url;

  let fixedUrl = url;

  // Fix missing src/ in path
  if (fixedUrl.includes("/blob/main/commands/")) {
    fixedUrl = fixedUrl.replace(
      "/blob/main/commands/",
      "/blob/main/src/commands/"
    );
    console.log(`🔧 Fixed missing src/ in URL: ${url} → ${fixedUrl}`);
  }

  // Fix Windows paths with backslashes
  if (fixedUrl.includes("\\")) {
    const pathMatch = fixedUrl.match(
      // eslint-disable-next-line
      /\/src\/commands\/([^\/]+)\/([^\/]+\.js)$/
    );
    if (pathMatch) {
      const [, commandName, fileName] = pathMatch;
      fixedUrl = fixedUrl.replace(
        // eslint-disable-next-line
        /\/src\/commands\/[^\/]+\/[^\/]+\.js$/,
        `/src/commands/${commandName}/${fileName}`
      );
      console.log(`🔧 Fixed Windows path in URL: ${url} → ${fixedUrl}`);
    }
  }

  // Fix wrong username (fchstbot -> leafyzito)
  if (fixedUrl.includes("fchstbot")) {
    fixedUrl = fixedUrl.replace("fchstbot", "leafyzito");
    console.log(`🔧 Fixed username in URL: ${url} → ${fixedUrl}`);
  }

  return fixedUrl;
}

/**
 * Validates that a command has all required properties
 * @param {Object} command - The command object to validate
 * @param {string} commandName - The name of the command for logging
 * @param {string} fixedCode - The fixed code URL (optional)
 * @returns {boolean} - True if valid, false otherwise
 */
function validateCommand(command, commandName, fixedCode = null) {
  const requiredFields = [
    "commandName",
    "aliases",
    "shortDescription",
    "cooldown",
    "whisperable",
    "description",
    "code",
  ];

  for (const field of requiredFields) {
    if (command[field] === undefined || command[field] === null) {
      console.warn(
        `⚠️  Skipping ${commandName}: Missing required field '${field}'`
      );
      return false;
    }
  }

  // Additional validation
  if (!Array.isArray(command.aliases) || command.aliases.length === 0) {
    console.warn(
      `⚠️  Skipping ${commandName}: 'aliases' must be a non-empty array`
    );
    return false;
  }

  if (typeof command.cooldown !== "number" || command.cooldown < 0) {
    console.warn(
      `⚠️  Skipping ${commandName}: 'cooldown' must be a non-negative number`
    );
    return false;
  }

  if (typeof command.whisperable !== "boolean") {
    console.warn(
      `⚠️  Skipping ${commandName}: 'whisperable' must be a boolean`
    );
    return false;
  }

  if (
    typeof command.description !== "string" ||
    command.description.trim() === ""
  ) {
    console.warn(
      `⚠️  Skipping ${commandName}: 'description' must be a non-empty string`
    );
    return false;
  }

  // Use fixed code if provided, otherwise use original
  const codeToValidate = fixedCode || command.code;

  if (
    typeof codeToValidate !== "string" ||
    !codeToValidate.startsWith("https://github.com/")
  ) {
    console.warn(
      `⚠️  Skipping ${commandName}: 'code' must be a valid GitHub URL`
    );
    return false;
  }

  // Validate GitHub URL structure
  const githubUrlPattern =
    // eslint-disable-next-line
    /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/blob\/[^\/]+\/src\/commands\/[^\/]+\/[^\/]+\.js$/;
  if (!githubUrlPattern.test(codeToValidate)) {
    console.warn(
      `⚠️  Skipping ${commandName}: 'code' URL must follow pattern: https://github.com/owner/repo/blob/branch/src/commands/command/file.js`
    );
    console.warn(`   Current URL: ${codeToValidate}`);
    return false;
  }

  return true;
}

/**
 * Processes all commands and creates a clean JSON structure
 * @returns {Object} - Processed commands object
 */
function processCommands() {
  console.log("🔄 Loading commands from files...");
  const rawCommandsList = loadCommands();

  console.log(
    `📊 Found ${Object.keys(rawCommandsList).length} command entries`
  );

  const processedCommands = {};
  let validCommands = 0;
  let skippedCommands = 0;
  let duplicateCommands = 0;

  // Process each command
  for (const [alias, command] of Object.entries(rawCommandsList)) {
    const commandName = command.commandName;

    // Skip if we've already processed this command (avoid duplicates)
    if (processedCommands[commandName]) {
      console.log(`🔄 Skipping duplicate: ${commandName} (alias: ${alias})`);
      duplicateCommands++;
      continue;
    }

    // Fix common URL issues first
    const fixedCode = fixCommonUrlIssues(command.code);

    // Validate command with fixed code
    if (!validateCommand(command, commandName, fixedCode)) {
      skippedCommands++;
      continue;
    }

    // Create clean command object
    const cleanCommand = {
      commandName: command.commandName,
      aliases: command.aliases,
      shortDescription: command.shortDescription,
      cooldown: command.cooldown,
      whisperable: command.whisperable,
      description: command.description,
      code: fixedCode,
    };

    // Add optional fields if they exist
    if (
      command.emojis &&
      Array.isArray(command.emojis) &&
      command.emojis.length > 0
    ) {
      cleanCommand.emojis = command.emojis;
    }

    if (
      command.langCodes &&
      Array.isArray(command.langCodes) &&
      command.langCodes.length > 0
    ) {
      cleanCommand.langCodes = command.langCodes;
    }

    if (
      command.examples &&
      Array.isArray(command.examples) &&
      command.examples.length > 0 &&
      command.examples.every(
        (example) =>
          example &&
          typeof example.description === "string" &&
          example.description.trim() !== "" &&
          typeof example.input === "string" &&
          example.input.trim() !== "" &&
          typeof example.output === "string" &&
          example.output.trim() !== ""
      )
    ) {
      cleanCommand.examples = command.examples;
    }

    processedCommands[commandName] = cleanCommand;
    validCommands++;

    console.log(
      `✅ Processed: ${commandName} (${command.aliases.length} aliases)`
    );
  }

  console.log("\n📈 Processing Summary:");
  console.log(`   ✅ Valid commands: ${validCommands}`);
  console.log(`   ⚠️  Skipped commands: ${skippedCommands}`);
  console.log(`   🔄 Duplicate commands: ${duplicateCommands}`);
  console.log(
    `   📊 Total processed: ${Object.keys(processedCommands).length}`
  );

  return processedCommands;
}

/**
 * Sorts commands alphabetically by command name
 * @param {Object} commands - Commands object to sort
 * @returns {Object} - Sorted commands object
 */
function sortCommands(commands) {
  return Object.fromEntries(
    Object.entries(commands).sort(([a], [b]) => a.localeCompare(b))
  );
}

/**
 * Main function to generate the commands.json file
 */
function generateCommandsJson() {
  try {
    console.log("🚀 Starting commands.json generation...\n");

    // Process all commands
    const processedCommands = processCommands();

    if (Object.keys(processedCommands).length === 0) {
      console.error("❌ No valid commands found! Exiting...");
      process.exit(1);
    }

    // Sort commands alphabetically
    console.log("\n🔄 Sorting commands alphabetically...");
    const sortedCommands = sortCommands(processedCommands);

    // Write to file
    console.log("💾 Writing to commands.json...");
    const outputPath = path.join(__dirname, "commands.json");
    const jsonContent = JSON.stringify(sortedCommands, null, 2);

    fs.writeFileSync(outputPath, jsonContent, "utf8");

    console.log(
      `✅ Successfully generated commands.json with ${
        Object.keys(sortedCommands).length
      } commands`
    );
    console.log(`📁 File saved to: ${outputPath}`);

    // Verify the file was written correctly
    const fileStats = fs.statSync(outputPath);
    console.log(`📊 File size: ${(fileStats.size / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error("❌ Error generating commands.json:", error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  generateCommandsJson();
}

module.exports = {
  generateCommandsJson,
  processCommands,
  validateCommand,
  sortCommands,
  fixCommonUrlIssues,
};
