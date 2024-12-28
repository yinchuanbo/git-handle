import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import simpleGit from 'simple-git';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Git operations
async function getGit(repoPath) {
    return simpleGit(repoPath);
}

// Routes
app.get('/api/status', async (req, res) => {
    try {
        const { repoPath } = req.query;
        const git = await getGit(repoPath);
        const status = await git.status();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/branches', async (req, res) => {
    try {
        const { repoPath } = req.query;
        const git = await getGit(repoPath);
        const branches = await git.branchLocal();
        res.json(branches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/commits', async (req, res) => {
    try {
        const { repoPath } = req.query;
        const git = await getGit(repoPath);
        const logs = await git.log(['--max-count=10']);
        // 确保返回正确的数据结构
        const commits = logs.all.map(commit => ({
            hash: commit.hash,
            date: commit.date,
            message: commit.message,
            author_name: commit.author_name,
            author_email: commit.author_email
        }));
        res.json({ all: commits });
    } catch (error) {
        console.error('Error getting commits:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/stage', async (req, res) => {
    try {
        const { repoPath, files } = req.body;
        const git = await getGit(repoPath);
        await git.add(files);
        res.json({ message: 'Files staged successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/commit', async (req, res) => {
    try {
        const { repoPath, message } = req.body;
        const git = await getGit(repoPath);
        await git.commit(message);
        res.json({ message: 'Changes committed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/push', async (req, res) => {
    try {
        const { repoPath } = req.body;
        const git = await getGit(repoPath);
        await git.push();
        res.json({ message: 'Changes pushed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/pull', async (req, res) => {
    try {
        const { repoPath } = req.body;
        const git = await getGit(repoPath);
        await git.pull();
        res.json({ message: 'Changes pulled successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/branch/create', async (req, res) => {
    try {
        const { repoPath, branchName } = req.body;
        const git = await getGit(repoPath);
        await git.checkoutLocalBranch(branchName);
        res.json({ message: 'Branch created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/branch/switch', async (req, res) => {
    try {
        const { repoPath, branchName } = req.body;
        const git = await getGit(repoPath);
        await git.checkout(branchName);
        res.json({ message: 'Switched to branch successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/branch/merge', async (req, res) => {
    try {
        const { repoPath, branchName } = req.body;
        const git = await getGit(repoPath);
        await git.merge([branchName]);
        res.json({ message: 'Branch merged successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 撤销提交
app.post('/api/revert', async (req, res) => {
    try {
        const { repoPath, hash } = req.body;
        
        if (!repoPath || !hash) {
            return res.status(400).json({ error: 'Repository path and commit hash are required' });
        }

        const git = simpleGit(repoPath);
        
        // 检查仓库状态
        const status = await git.status();
        if (status.files.length > 0) {
            return res.status(400).json({ 
                error: 'Working directory is not clean. Please commit or stash your changes first.' 
            });
        }

        // 检查提交是否存在
        try {
            await git.show(['--format=short', hash]);
        } catch (error) {
            return res.status(404).json({ 
                error: `Commit ${hash} not found. Please make sure the commit exists.` 
            });
        }

        // 获取提交信息用于撤销提交消息
        const commitInfo = await git.show(['--format=%s', hash]);
        const commitMessage = commitInfo.trim();

        // 执行撤销操作
        await git.raw(['revert', '--no-edit', hash]);
        
        res.json({ 
            message: 'Commit reverted successfully',
            revertedCommit: commitMessage
        });
    } catch (error) {
        console.error('Error reverting commit:', error);
        
        // 尝试中止可能的撤销操作
        try {
            await git.raw(['revert', '--abort']);
        } catch (abortError) {
            console.error('Error aborting revert:', abortError);
        }

        // 提供更详细的错误信息
        let errorMessage = 'Failed to revert commit.';
        if (error.message.includes('conflict')) {
            errorMessage = 'Cannot revert due to conflicts with local changes.';
        } else if (error.message.includes('patch')) {
            errorMessage = 'Cannot apply the revert patch. The changes may have already been reverted.';
        }

        res.status(500).json({ error: errorMessage });
    }
});

// Git 通用操作接口
app.post('/api/git-action', async (req, res) => {
    try {
        const { repoPath, action, params = [] } = req.body;
        
        if (!repoPath || !action) {
            return res.status(400).json({ error: 'Repository path and action are required' });
        }

        const git = await getGit(repoPath);
        let result;

        switch (action) {
            case 'branch':
                // 获取分支列表
                const branchResult = await git.branch(params);
                // 确保返回的是字符串数组格式
                result = Object.keys(branchResult.branches).map(branch => branch.trim());
                break;

            case 'checkout':
                if (params.includes('-b')) {
                    // 创建并切换到新分支
                    result = await git.checkoutLocalBranch(params[params.indexOf('-b') + 1]);
                } else {
                    // 切换到已有分支
                    result = await git.checkout(params[0]);
                }
                break;

            case 'log':
                result = await git.raw(['log', ...params]);
                break;

            case 'revert':
                result = await git.revert([params.hash]);
                break;

            case 'reset':
                result = await git.reset(['--hard', params.hash]);
                break;

            case 'status':
                result = await git.status();
                break;

            default:
                return res.status(400).json({ error: 'Invalid action' });
        }

        res.json({ result });
    } catch (error) {
        console.error('Git action error:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.git ? error.git : undefined
        });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
