import inquirer from 'inquirer';
import simpleGit from 'simple-git';
import chalk from 'chalk';
import ora from 'ora';
import { format } from 'date-fns';
import boxen from 'boxen';
import { promises as fs } from 'fs';
import path from 'path';

async function selectRepository() {
    const { repoPath } = await inquirer.prompt([
        {
            type: 'input',
            name: 'repoPath',
            message: 'Enter the path to your Git repository:',
            default: process.cwd(),
            validate: async (input) => {
                try {
                    const stats = await fs.stat(input);
                    return stats.isDirectory() ? true : 'Please enter a valid directory path';
                } catch (error) {
                    return 'Please enter a valid directory path';
                }
            }
        }
    ]);
    return repoPath;
}

async function getGitStatus(git) {
    const status = await git.status();
    return status;
}

async function displayCommitHistory(git) {
    const spinner = ora('Fetching commit history...').start();
    try {
        const logs = await git.log({
            '--max-count': '10',
            '--pretty': 'format:%h|%s|%an|%ad',
            '--date': 'short'
        });
        spinner.succeed('Commit history fetched');

        console.log(boxen(chalk.bold('Recent Commits'), { padding: 1, margin: 1, borderStyle: 'round' }));
        logs.all.forEach(commit => {
            const [hash, message, author, date] = commit.hash.split('|');
            console.log(
                chalk.yellow(`${hash} `) +
                chalk.white(`[${date}] `) +
                chalk.blue(`${author}: `) +
                chalk.green(message)
            );
        });
    } catch (error) {
        spinner.fail('Failed to fetch commit history');
        console.error(error);
    }
}

async function gitActions(git, repoPath) {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                'View Status',
                'View Commit History',
                'Stage Changes',
                'Commit Changes',
                'Push Changes',
                'Pull Changes',
                'Create Branch',
                'Switch Branch',
                'Merge Branch',
                'Exit'
            ]
        }
    ]);

    switch (action) {
        case 'View Status': {
            const status = await getGitStatus(git);
            console.log(boxen(chalk.bold('Git Status'), { padding: 1, margin: 1, borderStyle: 'round' }));
            console.log(chalk.blue('Current branch:'), chalk.green(status.current));
            console.log(chalk.blue('\nModified files:'));
            status.modified.forEach(file => console.log(chalk.yellow('M ') + file));
            console.log(chalk.blue('\nUntracked files:'));
            status.not_added.forEach(file => console.log(chalk.red('? ') + file));
            break;
        }
        case 'View Commit History': {
            await displayCommitHistory(git);
            break;
        }
        case 'Stage Changes': {
            const status = await getGitStatus(git);
            const files = [...status.modified, ...status.not_added];
            if (files.length === 0) {
                console.log(chalk.yellow('No changes to stage'));
                break;
            }
            const { selectedFiles } = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'selectedFiles',
                    message: 'Select files to stage:',
                    choices: files
                }
            ]);
            if (selectedFiles.length > 0) {
                await git.add(selectedFiles);
                console.log(chalk.green('Files staged successfully'));
            }
            break;
        }
        case 'Commit Changes': {
            const { message } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'message',
                    message: 'Enter commit message:',
                    validate: input => input.length > 0 || 'Commit message is required'
                }
            ]);
            await git.commit(message);
            console.log(chalk.green('Changes committed successfully'));
            break;
        }
        case 'Push Changes': {
            const spinner = ora('Pushing changes...').start();
            try {
                await git.push();
                spinner.succeed('Changes pushed successfully');
            } catch (error) {
                spinner.fail('Failed to push changes');
                console.error(error);
            }
            break;
        }
        case 'Pull Changes': {
            const spinner = ora('Pulling changes...').start();
            try {
                await git.pull();
                spinner.succeed('Changes pulled successfully');
            } catch (error) {
                spinner.fail('Failed to pull changes');
                console.error(error);
            }
            break;
        }
        case 'Create Branch': {
            const { branchName } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'branchName',
                    message: 'Enter new branch name:',
                    validate: input => input.length > 0 || 'Branch name is required'
                }
            ]);
            await git.checkoutLocalBranch(branchName);
            console.log(chalk.green(`Created and switched to branch ${branchName}`));
            break;
        }
        case 'Switch Branch': {
            const branches = await git.branchLocal();
            const { branch } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'branch',
                    message: 'Select branch to switch to:',
                    choices: branches.all
                }
            ]);
            await git.checkout(branch);
            console.log(chalk.green(`Switched to branch ${branch}`));
            break;
        }
        case 'Merge Branch': {
            const branches = await git.branchLocal();
            const { branch } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'branch',
                    message: 'Select branch to merge from:',
                    choices: branches.all.filter(b => b !== branches.current)
                }
            ]);
            await git.merge([branch]);
            console.log(chalk.green(`Merged ${branch} into current branch`));
            break;
        }
        case 'Exit': {
            return false;
        }
    }
    return true;
}

async function main() {
    console.log(boxen(chalk.bold.blue('Git Handle - Modern Git Management Tool'), 
        { padding: 1, margin: 1, borderStyle: 'double' }));
    
    const repoPath = await selectRepository();
    const git = simpleGit(repoPath);

    try {
        await git.checkIsRepo();
    } catch (error) {
        console.error(chalk.red('The selected directory is not a Git repository'));
        return;
    }

    let continueRunning = true;
    while (continueRunning) {
        continueRunning = await gitActions(git, repoPath);
    }
}

main().catch(console.error);
