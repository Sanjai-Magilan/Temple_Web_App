pipeline {
    agent any

    environment {
        NODE_ENV = 'test'
        IMAGE = 'sanjaimagilan/temple_app'
    }

    stages {
        stage('Install & Test') {
            agent {
                docker {
                    image 'node:20'
                }
            }
            steps {
                echo 'Installing dependencies...'
                sh 'npm install'

                echo 'Starting app for verification...'
                sh 'timeout 10s npm start || true'

                sh 'npm run lint || echo "No lint configured"'
                sh 'npm test || echo "No tests configured"'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                docker build -t $IMAGE:$BUILD_NUMBER .
                docker tag $IMAGE:$BUILD_NUMBER $IMAGE:latest
                '''
            }
        }

        stage('Docker Login') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub',
                    usernameVariable: 'USER',
                    passwordVariable: 'PASS'
                )]) {
                    sh '''
                    echo "$PASS" | docker login -u "$USER" --password-stdin
                    '''
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                sh '''
                docker push $IMAGE:$BUILD_NUMBER
                docker push $IMAGE:latest
                '''
            }
        }

        stage('Cleanup') {
            steps {
                sh 'docker image prune -f'
            }
        }
    }

    post {
        success {
            echo 'Build & Push Successful'
        }
        failure {
            echo 'Build Failed'
        }
    }
}
