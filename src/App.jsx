import { useEffect, useState, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import Lottie from 'lottie-react';
import avatarImage from './assets/pic.jpg';
import loaderAnimation from './assets/loader.json';

// Ссылки на n8n
const N8N_WEBHOOK_URL = 'https://tender1acc.app.n8n.cloud/webhook/f275c34f-8416-407b-a869-48c3362becfb';
const PDF_WEBHOOK_URL = 'https://tender1acc.app.n8n.cloud/webhook-test/a8c660bb-76ef-4a31-a0c5-78d3ee419436';

function App() {
    const [userData, setUserData] = useState(null);
    const [file, setFile] = useState(null);
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    // Геймификация
    const [coins, setCoins] = useState(1500);
    const [level, setLevel] = useState(14);
    const [filesAnalyzed, setFilesAnalyzed] = useState(23);

    const fileInputRef = useRef(null);
    const isTelegramEnv = WebApp.initData !== '';

    useEffect(() => {
        try {
            if (isTelegramEnv) {
                WebApp.ready();
                WebApp.expand();

                if (WebApp.isVersionAtLeast('6.1')) {
                    WebApp.setHeaderColor('secondary_bg_color');
                }

                if (WebApp.initDataUnsafe.user) {
                    setUserData(WebApp.initDataUnsafe.user);
                }

                if (WebApp.isVersionAtLeast('6.9')) {
                    WebApp.CloudStorage.getItem('last_analysis', (error, value) => {
                        if (!error && value) {
                            setResult(value);
                        }
                    });
                } else {
                    const saved = localStorage.getItem('last_analysis');
                    if (saved) setResult(saved);
                }
            } else {
                // Мок-данные для разработки в браузере
                setUserData({ id: 'dev_12345', first_name: 'Developer' });
                const saved = localStorage.getItem('last_analysis');
                if (saved) setResult(saved);
            }
        } catch (error) {
            console.error('Ошибка инициализации:', error);
        }
    }, [isTelegramEnv]);

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setResult('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('chat_id', userData?.id || 'unknown');

        try {
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                body: formData,
            });

            const textResponse = await response.text();
            let finalOutput = textResponse;

            try {
                const data = JSON.parse(textResponse);
                finalOutput = data.output || data.text || JSON.stringify(data);
            } catch (e) {
                console.log('Not JSON');
            }

            setResult(finalOutput);

            // Награды
            setCoins(prev => prev + 50);
            setFilesAnalyzed(prev => prev + 1);

            if (isTelegramEnv && WebApp.isVersionAtLeast('6.9')) {
                WebApp.CloudStorage.setItem('last_analysis', finalOutput);
            } else {
                localStorage.setItem('last_analysis', finalOutput);
            }

        } catch (error) {
            setResult('❌ Ошибка сети: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // === ВОТ НОВАЯ ФУНКЦИЯ ДЛЯ ОТПРАВКИ PDF В ЧАТ ===
    const handleDownloadPDF = async () => {
        if (!result) return;

        // Проверяем, что у нас есть Chat ID
        const chatId = userData?.id;
        if (!chatId) {
            alert('Ошибка: Не удалось определить ваш Chat ID');
            return;
        }

        setPdfLoading(true);

        try {
            const formData = new FormData();
            formData.append('result', result);
            formData.append('fileName', file?.name || 'document');
            formData.append('userName', userData?.first_name || 'User');
            formData.append('chatId', chatId); // <--- ГЛАВНОЕ ИЗМЕНЕНИЕ: Отправляем Chat ID

            const response = await fetch(PDF_WEBHOOK_URL, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                // Теперь мы ждем JSON, а не blob
                const data = await response.json();

                if (data.success) {
                    // Показываем сообщение об успехе
                    if (isTelegramEnv && WebApp.isVersionAtLeast('6.2')) {
                        // Если доступен showAlert, используем его
                        WebApp.showAlert('✅ PDF отправлен в чат и доступен для скачивания!');

                        // Вибрация успеха
                        if (WebApp.HapticFeedback) {
                            WebApp.HapticFeedback.notificationOccurred('success');
                        }
                    } else {
                        // Fallback для старых версий или браузера
                        alert('✅ PDF отправлен в чат!');
                    }
                } else {
                    alert('Ошибка: ' + (data.message || 'Неизвестная ошибка'));
                }
            } else {
                const errorText = await response.text();
                console.error('Server error:', errorText);
                alert('Ошибка сервера: ' + response.status);
            }
        } catch (error) {
            console.error('PDF Error:', error);
            alert('Ошибка сети: ' + error.message);
        } finally {
            setPdfLoading(false);
        }
    };

    const handleClearHistory = () => {
        setResult('');
        setFile(null);

        if (isTelegramEnv && WebApp.isVersionAtLeast('6.9')) {
            WebApp.CloudStorage.removeItem('last_analysis');
        } else {
            localStorage.removeItem('last_analysis');
        }
    };

    return (
        <div className="app-container">
            <div className="content-wrapper">

                {/* User Profile Card */}
                <div className="user-card">
                    <div className="user-info-container">
                        <div className="user-avatar">
                            <img
                                src={avatarImage}
                                alt="Avatar"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '20px'
                                }}
                            />
                        </div>
                        <div className="user-details">
                            <div className="user-name">
                                {userData ? userData.first_name : 'Загрузка...'}
                                {!isTelegramEnv && <span className="dev-badge">Dev</span>}
                            </div>
                            <div className="user-id">
                                ID: {userData?.id || '---'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Action Card */}
                <div className="action-card">
                    <h2 className="section-title">
                        <span>📂</span>
                        <span>Загрузка документа</span>
                    </h2>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => setFile(e.target.files[0])}
                        style={{ display: 'none' }}
                        accept=".csv,.pdf,.txt,.xlsx"
                    />

                    {loading ? (
                        <div className="loading-container">
                            <Lottie
                                animationData={loaderAnimation}
                                loop={true}
                                style={{ width: 200, height: 200, margin: '0 auto' }}
                            />
                            <div className="loading-text">
                                <h3>🤖 Агент анализирует документ...</h3>
                                <p>Это может занять некоторое время</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div
                                className={`upload-zone ${file ? 'has-file' : ''}`}
                                onClick={() => fileInputRef.current.click()}
                            >
                                <span className="upload-icon">
                                    {file ? '📄' : '☁️'}
                                </span>
                                <div className="upload-title">
                                    {file ? 'Файл готов!' : 'Выберите файл'}
                                </div>
                                <div className="upload-subtitle">
                                    {file ? 'Отлично! Теперь нажмите анализировать' : 'PDF, CSV, TXT, XLSX'}
                                </div>
                                {file && (
                                    <div className="file-name-display">
                                        {file.name}
                                    </div>
                                )}
                            </div>

                            {file && (
                                <button
                                    className="btn-primary"
                                    onClick={handleUpload}
                                    disabled={loading}
                                >
                                    <div className="btn-content">
                                        <span>🚀</span>
                                        <span>Анализировать</span>
                                    </div>
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Result Card */}
                {result && (
                    <div className="result-card">
                        <div className="result-header">
                            <span style={{ fontSize: 28 }}>✨</span>
                            <h3 className="result-title">Результат анализа</h3>
                        </div>
                        <div className="result-text">
                            {result}
                        </div>

                        <div className="result-actions" style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                            <button
                                className="btn-download"
                                onClick={handleDownloadPDF}
                                disabled={pdfLoading}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    backgroundColor: '#2481cc',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    opacity: pdfLoading ? 0.7 : 1
                                }}
                            >
                                {pdfLoading ? (
                                    <span>⏳ Отправляем...</span>
                                ) : (
                                    <>
                                        <span>📨</span>
                                        <span>Отправить в чат</span>
                                    </>
                                )}
                            </button>

                            <button
                                className="btn-clear"
                                onClick={handleClearHistory}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '1px solid #ff4b4b',
                                    backgroundColor: 'transparent',
                                    color: '#ff4b4b',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                🗑️ Удалить
                            </button>
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="quick-actions">
                    <button className="quick-btn" onClick={() => alert('История скоро появится!')}>
                        <span className="quick-btn-icon">📜</span>
                        <span>История</span>
                    </button>
                    <button className="quick-btn" onClick={() => alert('Настройки скоро!')}>
                        <span className="quick-btn-icon">⚙️</span>
                        <span>Настройки</span>
                    </button>
                </div>

            </div>
        </div>
    );
}

export default App;

