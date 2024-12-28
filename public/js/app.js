// 通知组件样式
const NOTIFICATION_STYLES = {
    container: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999
    },
    notification: {
        background: 'var(--bg-dark)',
        color: 'var(--text-primary)',
        padding: '12px 24px',
        borderRadius: 'var(--border-radius)',
        marginBottom: '10px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        border: '1px solid var(--border-color)',
        minWidth: '300px',
        maxWidth: '500px',
        animation: 'slideIn 0.3s ease-out'
    },
    success: {
        borderLeft: '4px solid var(--success-color)'
    },
    error: {
        borderLeft: '4px solid var(--danger-color)'
    },
    icon: {
        width: '20px',
        height: '20px'
    },
    message: {
        flex: 1,
        margin: 0,
        fontSize: '14px'
    }
};

// 创建通知容器
function createNotificationContainer() {
    const container = document.getElementById('notification-container');
    if (container) return container;

    const newContainer = document.createElement('div');
    newContainer.id = 'notification-container';
    Object.assign(newContainer.style, NOTIFICATION_STYLES.container);
    document.body.appendChild(newContainer);
    return newContainer;
}

// 显示通知
function showNotification(message, type = 'success') {
    const container = createNotificationContainer();
    const notification = document.createElement('div');
    Object.assign(notification.style, NOTIFICATION_STYLES.notification);
    Object.assign(notification.style, NOTIFICATION_STYLES[type]);

    // 创建图标
    const icon = document.createElement('span');
    Object.assign(icon.style, NOTIFICATION_STYLES.icon);
    icon.innerHTML = type === 'success' 
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';

    // 创建消息文本
    const text = document.createElement('p');
    Object.assign(text.style, NOTIFICATION_STYLES.message);
    text.textContent = message;

    notification.appendChild(icon);
    notification.appendChild(text);
    container.appendChild(notification);

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // 3秒后移除通知
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
            // 如果容器为空，移除容器
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 3000);
}

// 显示成功消息
function showSuccess(message) {
    showNotification(message, 'success');
}

// 显示错误消息
function showError(message) {
    showNotification(message, 'error');
}

// DOM Elements
const repoPathInput = document.getElementById('repoPath');
const statusContent = document.getElementById('statusContent');
const stagedFiles = document.getElementById('stagedFiles');
const modifiedFiles = document.getElementById('modifiedFiles');
const untrackedFiles = document.getElementById('untrackedFiles');
const commitList = document.getElementById('commitList');
const commitMessageInput = document.getElementById('commitMessage');
const newBranchNameInput = document.getElementById('newBranchName');
const branchSelect = document.getElementById('branchSelect');

// Loading State Management
function setLoading(button, isLoading) {
    const overlay = button.querySelector('.loading-overlay');
    button.disabled = isLoading;
    if (isLoading) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// API Helper
async function fetchApi(endpoint, options = {}) {
    try {
        if (options.body) {
            options.headers = {
                ...options.headers,
                'Content-Type': 'application/json'
            };
        }

        const response = await fetch(endpoint, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Git Operations
async function refreshStatus() {
    const button = document.querySelector('button[onclick="refreshStatus()"]');
    try {
        setLoading(button, true);
        
        const repoPath = repoPathInput.value;
        if (!repoPath) {
            alert('Please enter a repository path');
            return;
        }

        const status = await fetchApi(`/api/status?repoPath=${encodeURIComponent(repoPath)}`);
        
        // Update current branch
        const currentBranch = statusContent.querySelector('.current-branch');
        currentBranch.innerHTML = `
            <div class="file-item">
                <i class="fas fa-code-branch"></i>
                <span>Current Branch: ${status.current}</span>
            </div>
        `;

        // Update staged files
        stagedFiles.innerHTML = '<h3>Staged Files:</h3>';
        if (status.staged && status.staged.length > 0) {
            status.staged.forEach(file => {
                stagedFiles.innerHTML += `
                    <div class="file-item staged">
                        <i class="fas fa-check-circle"></i>
                        <span>${file}</span>
                    </div>
                `;
            });
        } else {
            stagedFiles.innerHTML += `
                <div class="file-item">
                    <span style="color: var(--text-secondary);">No staged files</span>
                </div>
            `;
        }

        // Update modified files
        modifiedFiles.innerHTML = '<h3>Modified Files:</h3>';
        if (status.modified && status.modified.length > 0) {
            status.modified.forEach(file => {
                modifiedFiles.innerHTML += `
                    <div class="file-item modified" onclick="toggleFileSelection(this)" data-file="${file}">
                        <div class="checkbox">
                            <i class="fas fa-check"></i>
                        </div>
                        <i class="fas fa-file-code"></i>
                        <span>${file}</span>
                    </div>
                `;
            });
        } else {
            modifiedFiles.innerHTML += `
                <div class="file-item">
                    <span style="color: var(--text-secondary);">No modified files</span>
                </div>
            `;
        }

        // Update untracked files
        untrackedFiles.innerHTML = '<h3>Untracked Files:</h3>';
        if (status.not_added && status.not_added.length > 0) {
            status.not_added.forEach(file => {
                untrackedFiles.innerHTML += `
                    <div class="file-item untracked" onclick="toggleFileSelection(this)" data-file="${file}">
                        <div class="checkbox">
                            <i class="fas fa-check"></i>
                        </div>
                        <i class="fas fa-file"></i>
                        <span>${file}</span>
                    </div>
                `;
            });
        } else {
            untrackedFiles.innerHTML += `
                <div class="file-item">
                    <span style="color: var(--text-secondary);">No untracked files</span>
                </div>
            `;
        }

        // Update branch select
        await updateBranchSelect();
    } catch (error) {
        console.error('Error refreshing status:', error);
    } finally {
        setLoading(button, false);
    }
}

async function refreshCommits() {
    try {
        const repoPath = repoPathInput.value;
        if (!repoPath) return;

        const response = await fetchApi(`/api/commits?repoPath=${encodeURIComponent(repoPath)}`);
        const commits = response.all || [];
        
        // 清空提交列表
        commitList.innerHTML = '';

        // 遍历提交并创建元素
        commits.forEach(commit => {
            const date = new Date(commit.date);
            const formattedDate = formatDate(date);
            const authorName = commit.author_name || commit.author || 'Unknown';
            const shortHash = commit.hash.substring(0, 7);
            
            // 创建提交项容器
            const commitItem = document.createElement('div');
            commitItem.className = 'commit-item';

            // 创建提交头部
            const commitHeader = document.createElement('div');
            commitHeader.className = 'commit-header';

            // 创建提交标题
            const commitTitle = document.createElement('div');
            commitTitle.className = 'commit-title';
            const commitIcon = document.createElement('i');
            commitIcon.className = 'fas fa-code-commit';
            const commitMessage = document.createElement('span');
            commitMessage.className = 'commit-message';
            commitMessage.textContent = commit.message || 'No commit message';
            commitTitle.appendChild(commitIcon);
            commitTitle.appendChild(commitMessage);

            // 创建操作区域
            const commitActions = document.createElement('div');
            commitActions.className = 'commit-actions';
            const revertTypeSelect = document.createElement('select');
            revertTypeSelect.className = 'revert-type';
            revertTypeSelect.onchange = function() { handleRevertTypeChange(this, commit.hash); };

            // 添加选项
            const options = [
                { value: '', text: 'Revert Options' },
                { value: 'revert', text: 'Create Revert Commit' },
                { value: 'reset-soft', text: 'Reset (Soft) - Keep Changes' },
                { value: 'reset-mixed', text: 'Reset (Mixed) - Keep Files' },
                { value: 'reset-hard', text: 'Reset (Hard) - Discard All' },
                { value: 'checkout', text: 'Checkout Commit' },
                { value: 'drop', text: 'Drop Commit' }  // 添加 drop 选项
            ];

            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                revertTypeSelect.appendChild(option);
            });

            commitActions.appendChild(revertTypeSelect);

            // 创建提交信息
            const commitInfo = document.createElement('div');
            commitInfo.className = 'commit-info';
            commitInfo.innerHTML = `
                <span class="commit-hash">${shortHash}</span>
                <span class="commit-author">${authorName}</span>
                <span class="commit-date">${formattedDate}</span>
            `;

            // 组装提交项
            commitHeader.appendChild(commitTitle);
            commitHeader.appendChild(commitActions);
            commitItem.appendChild(commitHeader);
            commitItem.appendChild(commitInfo);
            commitList.appendChild(commitItem);
        });
    } catch (error) {
        console.error('Error refreshing commits:', error);
        commitList.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                Failed to load commits
                <small>${error.message}</small>
            </div>
        `;
    }
}

async function handleRevertTypeChange(select, hash) {
    const action = select.value;
    if (!action) return;

    const repoPath = repoPathInput.value;
    if (!repoPath) {
        alert('Please enter a repository path');
        select.value = '';
        return;
    }

    let confirmMessage = '';
    switch (action) {
        case 'revert':
            confirmMessage = 'This will create a new commit that undoes the changes from the selected commit.';
            break;
        case 'reset-soft':
            confirmMessage = 'This will reset to the selected commit but keep all changes staged.';
            break;
        case 'reset-mixed':
            confirmMessage = 'This will reset to the selected commit and unstage all changes.';
            break;
        case 'reset-hard':
            confirmMessage = 'WARNING: This will permanently discard all changes after the selected commit!';
            break;
        case 'checkout':
            confirmMessage = 'This will checkout the selected commit. You will be in "detached HEAD" state.';
            break;
        case 'drop':
            confirmMessage = 'WARNING: This will permanently remove this commit! This action cannot be undone.';
            break;
    }

    const confirmed = confirm(`Are you sure you want to ${action.replace('-', ' ')} this commit?\n\n${confirmMessage}`);
    if (!confirmed) {
        select.value = '';
        return;
    }

    // 显示加载状态
    select.disabled = true;
    const commitItem = select.closest('.commit-item');
    if (commitItem) {
        commitItem.classList.add('loading');
    }

    try {
        await fetchApi('/api/git-action', {
            method: 'POST',
            body: JSON.stringify({
                repoPath,
                action,
                hash
            })
        });

        // 如果是 drop 操作，添加移除动画
        if (action === 'drop' && commitItem) {
            await addRemoveAnimation(commitItem);
        }

        // 立即刷新状态
        await refreshStatus();
        
        // 如果是修改历史的操作，需要刷新提交历史
        if (action.startsWith('reset') || action === 'checkout' || action === 'drop') {
            await refreshCommits();
        }

        // 显示成功消息
        showSuccessMessage(`${action.replace('-', ' ')} operation completed successfully`);
    } catch (error) {
        console.error('Error performing git action:', error);
        const errorMessage = error.message || 'Failed to perform the operation';
        
        // 显示错误消息
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            ${errorMessage}
        `;
        
        if (commitItem) {
            commitItem.insertAdjacentElement('afterend', errorDiv);
            setTimeout(() => errorDiv.remove(), 3000);
        } else {
            alert(errorMessage);
        }
    } finally {
        // 恢复状态
        select.disabled = false;
        if (commitItem) {
            commitItem.classList.remove('loading');
        }
        select.value = '';
    }
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 30) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } else if (days > 0) {
        return `${days} day${days === 1 ? '' : 's'} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else {
        return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
    }
}

async function revertCommit(hash) {
    const button = document.querySelector(`button[onclick="revertCommit('${hash}')"]`);
    try {
        const repoPath = repoPathInput.value;
        if (!repoPath) {
            alert('Please enter a repository path');
            return;
        }

        const confirmed = confirm('Are you sure you want to revert this commit? This will create a new commit that undoes the changes from the selected commit.');
        if (!confirmed) return;

        setLoading(button, true);

        await fetchApi('/api/revert', {
            method: 'POST',
            body: JSON.stringify({
                repoPath,
                hash
            })
        });

        alert('Commit reverted successfully');
        await refreshStatus();
        await refreshCommits();
    } catch (error) {
        console.error('Error reverting commit:', error);
        alert(error.message || 'Failed to revert commit');
    } finally {
        setLoading(button, false);
    }
}

async function stageAll() {
    const button = document.querySelector('button[onclick="stageAll()"]');
    try {
        setLoading(button, true);

        const repoPath = repoPathInput.value;
        if (!repoPath) {
            alert('Please enter a repository path');
            return;
        }

        await fetchApi('/api/stage', {
            method: 'POST',
            body: JSON.stringify({
                repoPath,
                files: ['*']
            })
        });

        alert('Changes staged successfully');
        await refreshStatus();
    } catch (error) {
        console.error('Error staging changes:', error);
    } finally {
        setLoading(button, false);
    }
}

async function commit() {
    const button = document.querySelector('button[onclick="commit()"]');
    try {
        setLoading(button, true);

        const repoPath = repoPathInput.value;
        const message = commitMessageInput.value;

        if (!repoPath) {
            alert('Please enter a repository path');
            return;
        }
        if (!message) {
            alert('Please enter a commit message');
            return;
        }

        await fetchApi('/api/commit', {
            method: 'POST',
            body: JSON.stringify({
                repoPath,
                message
            })
        });

        alert('Changes committed successfully');
        commitMessageInput.value = '';
        await refreshStatus();
        await refreshCommits();
    } catch (error) {
        console.error('Error committing changes:', error);
    } finally {
        setLoading(button, false);
    }
}

async function push() {
    const button = document.querySelector('button[onclick="push()"]');
    try {
        setLoading(button, true);

        const repoPath = repoPathInput.value;
        if (!repoPath) {
            alert('Please enter a repository path');
            return;
        }

        await fetchApi('/api/push', {
            method: 'POST',
            body: JSON.stringify({ repoPath })
        });

        alert('Changes pushed successfully');
    } catch (error) {
        console.error('Error pushing changes:', error);
    } finally {
        setLoading(button, false);
    }
}

async function pull() {
    const button = document.querySelector('button[onclick="pull()"]');
    try {
        setLoading(button, true);

        const repoPath = repoPathInput.value;
        if (!repoPath) {
            alert('Please enter a repository path');
            return;
        }

        await fetchApi('/api/pull', {
            method: 'POST',
            body: JSON.stringify({ repoPath })
        });

        alert('Changes pulled successfully');
        await refreshStatus();
        await refreshCommits();
    } catch (error) {
        console.error('Error pulling changes:', error);
    } finally {
        setLoading(button, false);
    }
}

async function updateBranchSelect() {
    try {
        const repoPath = repoPathInput.value;
        if (!repoPath) return;

        const response = await fetchApi(`/api/branches?repoPath=${encodeURIComponent(repoPath)}`);
        
        branchSelect.innerHTML = '<option value="" disabled selected>Select a branch</option>';
        response.all.forEach(branch => {
            branchSelect.innerHTML += `<option value="${branch}">${branch}</option>`;
        });
    } catch (error) {
        console.error('Error updating branch select:', error);
    }
}

async function createBranch() {
    const button = document.querySelector('button[onclick="createBranch()"]');
    try {
        setLoading(button, true);

        const repoPath = repoPathInput.value;
        const branchName = newBranchNameInput.value;

        if (!repoPath) {
            alert('Please enter a repository path');
            return;
        }
        if (!branchName) {
            alert('Please enter a branch name');
            return;
        }

        await fetchApi('/api/branch/create', {
            method: 'POST',
            body: JSON.stringify({
                repoPath,
                branchName
            })
        });

        alert('Branch created successfully');
        newBranchNameInput.value = '';
        await refreshStatus();
    } catch (error) {
        console.error('Error creating branch:', error);
    } finally {
        setLoading(button, false);
    }
}

async function switchBranch() {
    const button = document.querySelector('button[onclick="switchBranch()"]');
    try {
        setLoading(button, true);

        const repoPath = repoPathInput.value;
        const branchName = branchSelect.value;

        if (!repoPath) {
            alert('Please enter a repository path');
            return;
        }
        if (!branchName) {
            alert('Please select a branch');
            return;
        }

        await fetchApi('/api/branch/switch', {
            method: 'POST',
            body: JSON.stringify({
                repoPath,
                branchName
            })
        });

        alert('Switched to branch successfully');
        await refreshStatus();
    } catch (error) {
        console.error('Error switching branch:', error);
    } finally {
        setLoading(button, false);
    }
}

async function mergeBranch() {
    const button = document.querySelector('button[onclick="mergeBranch()"]');
    try {
        setLoading(button, true);

        const repoPath = repoPathInput.value;
        const branchName = branchSelect.value;

        if (!repoPath) {
            alert('Please enter a repository path');
            return;
        }
        if (!branchName) {
            alert('Please select a branch to merge');
            return;
        }

        await fetchApi('/api/branch/merge', {
            method: 'POST',
            body: JSON.stringify({
                repoPath,
                branchName
            })
        });

        alert('Branch merged successfully');
        await refreshStatus();
        await refreshCommits();
    } catch (error) {
        console.error('Error merging branch:', error);
    } finally {
        setLoading(button, false);
    }
}

// File Selection
function toggleFileSelection(element) {
    element.classList.toggle('selected');
}

function getSelectedFiles() {
    const selectedElements = document.querySelectorAll('.file-item.selected');
    return Array.from(selectedElements).map(el => el.dataset.file);
}

async function stageSelected() {
    const button = document.querySelector('button[onclick="stageSelected()"]');
    try {
        const selectedFiles = getSelectedFiles();
        if (selectedFiles.length === 0) {
            alert('Please select files to stage');
            return;
        }

        setLoading(button, true);
        const repoPath = repoPathInput.value;
        
        if (!repoPath) {
            alert('Please enter a repository path');
            return;
        }

        await fetchApi('/api/stage', {
            method: 'POST',
            body: JSON.stringify({
                repoPath,
                files: selectedFiles
            })
        });

        alert('Selected files staged successfully');
        await refreshStatus();
    } catch (error) {
        console.error('Error staging selected files:', error);
    } finally {
        setLoading(button, false);
    }
}

// 显示成功消息
function showSuccessMessage(message) {
    showSuccess(message);
}

// 添加移除动画
function addRemoveAnimation(element) {
    return new Promise(resolve => {
        element.classList.add('removing');
        element.addEventListener('animationend', () => {
            resolve();
        });
    });
}

// 添加平滑滚动
function scrollToCommit(commitHash) {
    const commitElement = document.querySelector(`[data-hash="${commitHash}"]`);
    if (commitElement) {
        commitElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Initial setup
repoPathInput.addEventListener('change', refreshStatus);

// 全局变量用于追踪加载状态
let isLoading = false;
let hasMoreCommits = true;
let currentPage = 1;
const COMMITS_PER_PAGE = 50;

// 创建弹窗HTML结构
function createModal(title) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h2 class="modal-title">${title}</h2>
                <button class="modal-close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <div class="commits-container"></div>
                <div class="loading-spinner"></div>
            </div>
        </div>
    `;

    // 点击关闭按钮关闭弹窗
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => closeModal(modal));

    // 点击遮罩层关闭弹窗
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });

    // ESC键关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal(modal);
        }
    });

    return modal;
}

// 修改显示Recent Commits的函数
async function showRecentCommits() {
    // 重置状态
    currentPage = 1;
    hasMoreCommits = true;
    isLoading = false;

    // 创建并显示弹窗
    const modal = createModal('Recent Commits');
    openModal(modal);

    // 获取容器元素
    const commitsContainer = modal.querySelector('.commits-container');
    const modalBody = modal.querySelector('.modal-body');

    // 加载第一页数据
    await loadCommits(commitsContainer);

    // 添加滚动监听
    modalBody.addEventListener('scroll', async () => {
        if (isLoading || !hasMoreCommits) return;

        const { scrollTop, scrollHeight, clientHeight } = modalBody;
        // 当滚动到距离底部100px时加载更多
        if (scrollHeight - scrollTop - clientHeight < 100) {
            await loadCommits(commitsContainer);
        }
    });
}

// 加载提交记录
async function loadCommits(container) {
    if (isLoading || !hasMoreCommits) return;

    try {
        isLoading = true;
        showLoading(true);

        const skip = (currentPage - 1) * COMMITS_PER_PAGE;
        const response = await fetch('/api/git-action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'log',
                params: [
                    '--pretty=format:%H|%s|%an|%ar',
                    '--skip', skip.toString(),
                    '-n', COMMITS_PER_PAGE.toString()
                ]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch commits');
        }

        const data = await response.text();
        const commits = data.trim().split('\n');

        // 检查是否还有更多提交
        hasMoreCommits = commits.length === COMMITS_PER_PAGE;

        // 如果没有提交记录
        if (!commits[0]) {
            hasMoreCommits = false;
            if (currentPage === 1) {
                container.innerHTML = '<div class="no-commits">No commits found</div>';
            }
            return;
        }

        // 创建提交列表的HTML
        const commitsHTML = commits.map(line => {
            const [hash, message, author, date] = line.split('|');
            return `
                <div class="commit-item" data-hash="${hash}">
                    <div class="commit-header">
                        <div class="commit-title">
                            <span class="commit-message">${escapeHtml(message)}</span>
                        </div>
                        <div class="commit-actions">
                            <select class="revert-type" aria-label="Select revert type">
                                <option value="revert">Revert</option>
                                <option value="reset-soft">Reset (Soft)</option>
                                <option value="reset-mixed">Reset (Mixed)</option>
                                <option value="reset-hard">Reset (Hard)</option>
                                <option value="checkout">Checkout</option>
                            </select>
                            <button class="btn btn-primary commit-action-btn">Apply</button>
                        </div>
                    </div>
                    <div class="commit-info">
                        <span class="commit-hash">${hash.substring(0, 7)}</span>
                        <span class="commit-author">${escapeHtml(author)}</span>
                        <span class="commit-date">${date}</span>
                    </div>
                </div>
            `;
        }).join('');

        // 添加新的提交记录
        if (currentPage === 1) {
            container.innerHTML = commitsHTML;
        } else {
            container.insertAdjacentHTML('beforeend', commitsHTML);
        }

        // 为新添加的提交项添加事件监听器
        const newCommitItems = container.querySelectorAll('.commit-item:not([data-initialized])');
        newCommitItems.forEach(item => {
            item.querySelector('.commit-action-btn').addEventListener('click', handleCommitAction);
            item.setAttribute('data-initialized', 'true');
        });

        currentPage++;

    } catch (error) {
        showError('Failed to load commits: ' + error.message);
        hasMoreCommits = false;
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

// 显示/隐藏加载动画
function showLoading(show) {
    const spinner = document.querySelector('.loading-spinner');
    if (spinner) {
        spinner.classList.toggle('active', show);
    }
}

// Escape HTML
function escapeHtml(str) {
    return str.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#039;');
}

// Handle commit action
function handleCommitAction(e) {
    const commitItem = e.target.closest('.commit-item');
    const hash = commitItem.dataset.hash;
    const revertType = commitItem.querySelector('.revert-type').value;

    // Handle revert action
    if (revertType) {
        handleRevertTypeChange(commitItem.querySelector('.revert-type'), hash);
    }
}

// 打开弹窗
function openModal(modal) {
    document.body.appendChild(modal);
    // 使用setTimeout确保过渡动画生效
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    // 禁止背景滚动
    document.body.style.overflow = 'hidden';
}

// 关闭弹窗
function closeModal(modal) {
    modal.classList.remove('active');
    // 等待过渡动画结束后移除弹窗
    setTimeout(() => {
        modal.remove();
        // 恢复背景滚动
        document.body.style.overflow = '';
    }, 300);
}

// Git Flow 配置
const GITFLOW_CONFIG = {
    masterBranch: 'master',
    developBranch: 'develop',
    featurePrefix: 'feature/',
    releasePrefix: 'release/',
    hotfixPrefix: 'hotfix/',
    versionTagPrefix: 'v'
};

// Git Flow 分支类型
const BRANCH_TYPES = {
    FEATURE: 'feature',
    RELEASE: 'release',
    HOTFIX: 'hotfix'
};

// 检查分支是否存在
async function checkBranchExists(branch) {
    try {
        const repoPath = document.getElementById('repoPath').value;
        if (!repoPath) {
            throw new Error('Repository path is required');
        }

        const response = await fetch('/api/git-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'branch',
                repoPath: repoPath,
                params: ['--list']
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to check branch');
        }

        const { result } = await response.json();
        return Array.isArray(result) && result.some(b => b === branch || b === `remotes/origin/${branch}`);
    } catch (error) {
        console.error('Branch check error:', error);
        throw new Error(`Failed to check branch ${branch}: ${error.message}`);
    }
}

// 创建分支
async function createBranch(branchName, baseBranch = null) {
    try {
        const repoPath = document.getElementById('repoPath').value;
        if (!repoPath) {
            throw new Error('Repository path is required');
        }

        const params = baseBranch ? ['-b', branchName, baseBranch] : ['-b', branchName];
        
        const response = await fetch('/api/git-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'checkout',
                repoPath: repoPath,
                params: params
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create branch');
        }

        return await response.json();
    } catch (error) {
        console.error('Branch creation error:', error);
        throw error;
    }
}

// 切换分支
async function checkoutBranch(branchName) {
    try {
        const repoPath = document.getElementById('repoPath').value;
        if (!repoPath) {
            throw new Error('Repository path is required');
        }

        const response = await fetch('/api/git-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'checkout',
                repoPath: repoPath,
                params: [branchName]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to checkout branch');
        }

        return await response.json();
    } catch (error) {
        console.error('Branch checkout error:', error);
        throw error;
    }
}

// 添加Git Flow相关的HTML
function addGitFlowSection() {
    const gitflowSection = document.createElement('div');
    gitflowSection.className = 'gitflow-section';
    gitflowSection.innerHTML = `
        <div class="gitflow-header">
            <h2 class="gitflow-title">Git Flow</h2>
            <div class="gitflow-actions">
                <button class="btn btn-primary" id="initGitFlow">Initialize Git Flow</button>
                <button class="btn btn-secondary" id="createBranch">Create Branch</button>
            </div>
        </div>
        <div id="gitFlowForm" style="display: none;">
            <form class="gitflow-form" id="branchForm">
                <div class="gitflow-form-group">
                    <label for="branchType">Branch Type</label>
                    <div class="gitflow-type-select">
                        <select id="branchType" required>
                            <option value="">Select branch type</option>
                            <option value="feature">Feature</option>
                            <option value="release">Release</option>
                            <option value="hotfix">Hotfix</option>
                        </select>
                    </div>
                </div>
                <div class="gitflow-form-group">
                    <label for="branchName">Branch Name</label>
                    <div class="input-group">
                        <span class="gitflow-prefix" id="branchPrefix"></span>
                        <input type="text" id="branchName" required placeholder="Enter branch name">
                    </div>
                    <div class="gitflow-branch-preview" id="branchPreview"></div>
                    <span class="help-text">Use lowercase letters, numbers, and hyphens only</span>
                </div>
                <div class="gitflow-form-group" id="versionGroup" style="display: none;">
                    <label for="version">Version</label>
                    <input type="text" id="version" placeholder="1.0.0">
                    <span class="help-text">Semantic version (e.g., 1.0.0)</span>
                </div>
                <button type="submit" class="btn btn-primary">Create Branch</button>
            </form>
        </div>
    `;

    // 插入到合适的位置
    const container = document.querySelector('.container');
    container.insertBefore(gitflowSection, container.firstChild);

    // 添加事件监听器
    setupGitFlowEventListeners();
}

// 设置Git Flow事件监听器
function setupGitFlowEventListeners() {
    const initButton = document.getElementById('initGitFlow');
    const createButton = document.getElementById('createBranch');
    const branchForm = document.getElementById('branchForm');
    const branchType = document.getElementById('branchType');
    const branchName = document.getElementById('branchName');
    const versionGroup = document.getElementById('versionGroup');
    const version = document.getElementById('version');
    const branchPrefix = document.getElementById('branchPrefix');
    const branchPreview = document.getElementById('branchPreview');

    initButton.addEventListener('click', initializeGitFlow);
    createButton.addEventListener('click', () => {
        document.getElementById('gitFlowForm').style.display = 'block';
    });

    branchType.addEventListener('change', () => {
        const type = branchType.value;
        branchPrefix.textContent = type ? GITFLOW_CONFIG[`${type}Prefix`] : '';
        versionGroup.style.display = (type === 'release' || type === 'hotfix') ? 'block' : 'none';
        updateBranchPreview();
    });

    branchName.addEventListener('input', updateBranchPreview);
    version.addEventListener('input', updateBranchPreview);

    branchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createGitFlowBranch();
    });
}

// 更新分支预览
function updateBranchPreview() {
    const type = document.getElementById('branchType').value;
    const name = document.getElementById('branchName').value;
    const version = document.getElementById('version').value;
    const preview = document.getElementById('branchPreview');

    if (!type) {
        preview.textContent = '';
        return;
    }

    const prefix = GITFLOW_CONFIG[`${type}Prefix`];
    let branchName = prefix + name;

    if ((type === 'release' || type === 'hotfix') && version) {
        branchName = prefix + version;
    }

    preview.textContent = branchName;
}

// 初始化Git Flow
async function initializeGitFlow() {
    try {
        // 检查master分支是否存在
        const masterExists = await checkBranchExists(GITFLOW_CONFIG.masterBranch);
        if (!masterExists) {
            await createBranch(GITFLOW_CONFIG.masterBranch);
        }

        // 创建develop分支
        const developExists = await checkBranchExists(GITFLOW_CONFIG.developBranch);
        if (!developExists) {
            await createBranch(GITFLOW_CONFIG.developBranch, GITFLOW_CONFIG.masterBranch);
        }

        showSuccess('Git Flow initialized successfully');
        refreshStatus();
    } catch (error) {
        showError('Failed to initialize Git Flow: ' + error.message);
    }
}

// 创建Git Flow分支
async function createGitFlowBranch() {
    const type = document.getElementById('branchType').value;
    const name = document.getElementById('branchName').value;
    const version = document.getElementById('version').value;

    if (!type || !name) {
        showError('Please fill in all required fields');
        return;
    }

    // 验证输入
    if (!validateBranchName(name)) {
        showError('Invalid branch name. Use lowercase letters, numbers, and hyphens only');
        return;
    }

    if ((type === 'release' || type === 'hotfix') && !validateVersion(version)) {
        showError('Invalid version number. Use semantic versioning (e.g., 1.0.0)');
        return;
    }

    try {
        const prefix = GITFLOW_CONFIG[`${type}Prefix`];
        let branchName = prefix + name;
        let baseBranch = '';

        // 根据不同类型设置基础分支
        switch (type) {
            case BRANCH_TYPES.FEATURE:
                baseBranch = GITFLOW_CONFIG.developBranch;
                break;
            case BRANCH_TYPES.RELEASE:
                baseBranch = GITFLOW_CONFIG.developBranch;
                branchName = prefix + version;
                break;
            case BRANCH_TYPES.HOTFIX:
                baseBranch = GITFLOW_CONFIG.masterBranch;
                branchName = prefix + version;
                break;
            default:
                throw new Error('Invalid branch type');
        }

        // 检查分支是否已存在
        const exists = await checkBranchExists(branchName);
        if (exists) {
            throw new Error(`Branch ${branchName} already exists`);
        }

        // 创建新分支
        await createBranch(branchName, baseBranch);
        showSuccess(`Created ${type} branch: ${branchName}`);
        
        // 切换到新分支
        await checkoutBranch(branchName);
        
        // 刷新状态并重置表单
        refreshStatus();
        document.getElementById('branchForm').reset();
        document.getElementById('gitFlowForm').style.display = 'none';
    } catch (error) {
        showError('Failed to create branch: ' + error.message);
    }
}

// 验证分支名称
function validateBranchName(name) {
    return /^[a-z0-9-]+$/.test(name);
}

// 验证版本号
function validateVersion(version) {
    return /^\d+\.\d+\.\d+$/.test(version);
}

// 在初始化时添加Git Flow部分
document.addEventListener('DOMContentLoaded', () => {
    addGitFlowSection();
});
