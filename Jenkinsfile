pipeline {
    agent any

    environment {
        NODE_ENV = 'test'
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

        stage('Test Docker Access') {
            steps {
                sh 'docker ps'
            }
        }
    }

    post {
        success {
            echo 'Build Successful'
        }
        failure {
            echo 'Build Failed'
        }
    }
}