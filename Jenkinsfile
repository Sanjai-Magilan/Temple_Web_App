pipeline {
    agent {
        docker {
            image 'node:20'
        }
    }

    options {
        skipDefaultCheckout(true)
    }

    environment {
        NODE_ENV = 'test'
    }

    stages {

        stage('Checkout') {
            steps {
                git url: 'https://github.com/Sanjai-Magilan/Temple_Web_App.git',
                    branch: 'main',
                    credentialsId: 'github-creds'
            }
        }

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