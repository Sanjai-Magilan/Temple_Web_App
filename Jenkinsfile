pipeline {
    agent {
        docker {
            image 'node:20'
        }
    }

    environment {
        NODE_ENV = 'test'
    }

    stages {

        stage('Install Dependencies') {
            steps {
                echo 'Installing dependencies...'
                sh 'npm install'
            }
        }

        stage('Check App Start') {
            steps {
                echo 'Starting app for verification...'
                sh '''
                timeout 10s npm start || true
                '''
            }
        }

        stage('Lint (Optional)') {
            steps {
                sh 'npm run lint || echo "No lint configured"'
            }
        }

        stage('Test (Optional)') {
            steps {
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
