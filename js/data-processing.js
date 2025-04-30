// Gerenciamento de uploads e processamento de dados
const dataProcessing = {
    // Realizar upload de arquivo
    uploadFile: function(file, type) {
        return new Promise((resolve, reject) => {
            // Verificar tipo de arquivo
            const validExtensions = ['.xlsx', '.xls', '.csv'];
            const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            
            if (!validExtensions.includes(fileExt)) {
                reject(new Error('Formato de arquivo inválido. Por favor, utilize Excel (.xlsx, .xls) ou CSV.'));
                return;
            }
            
            // Referência de armazenamento
            const storageRef = storage.ref(`uploads/${type}/${Date.now()}_${file.name}`);
            
            // Iniciar upload
            const uploadTask = storageRef.put(file);
            
            // Monitor de progresso
            uploadTask.on('state_changed', 
                // Progresso
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`Upload: ${progress.toFixed(1)}%`);
                    
                    // Você pode usar para atualizar uma barra de progresso
                    if (typeof this.onProgress === 'function') {
                        this.onProgress(progress);
                    }
                },
                // Erro
                (error) => {
                    console.error('Erro no upload:', error);
                    reject(error);
                },
                // Sucesso
                () => {
                    // Obter URL do arquivo
                    uploadTask.snapshot.ref.getDownloadURL()
                        .then((downloadURL) => {
                            // Criar registro no Firestore
                            db.collection('fileUploads').add({
                                fileUrl: downloadURL,
                                fileType: type,
                                fileName: file.name,
                                uploadedBy: auth.currentUser.uid,
                                uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                status: 'pending',
                                processedAt: null
                            })
                            .then((docRef) => {
                                resolve({
                                    id: docRef.id,
                                    url: downloadURL,
                                    fileName: file.name
                                });
                            })
                            .catch((error) => {
                                reject(error);
                            });
                        })
                        .catch((error) => {
                            reject(error);
                        });
                }
            );
        });
    },
    
    // Monitorar status de processamento
    monitorProcessing: function(uploadId, onComplete, onError) {
        const unsubscribe = db.collection('fileUploads').doc(uploadId)
            .onSnapshot((doc) => {
                if (!doc.exists) {
                    onError(new Error('Upload não encontrado'));
                    unsubscribe();
                    return;
                }
                
                const data = doc.data();
                
                if (data.status === 'processed') {
                    onComplete(data);
                    unsubscribe();
                } else if (data.status === 'error') {
                    onError(new Error(data.errorMessage || 'Erro ao processar arquivo'));
                    unsubscribe();
                }
                
                // Continua monitorando se status é 'pending'
            }, (error) => {
                onError(error);
                unsubscribe();
            });
            
        return unsubscribe;
    },
    
    // Obter última atualização
    getLastUpdate: function() {
        return db.collection('config').doc('lastUpdate').get()
            .then((doc) => {
                if (!doc.exists) {
                    return {
                        indicadoresTimestamp: null,
                        produtosTimestamp: null
                    };
                }
                return doc.data();
            });
    },
    
    // Definir callbacks
    onProgress: null,
    onSuccess: null,
    onError: null
};
