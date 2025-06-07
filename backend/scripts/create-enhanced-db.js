const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../db/itsm.sqlite');
const schemaPath = path.join(__dirname, '../db/schema-enhanced.sql');

console.log('🔧 Creating fresh database with enhanced schema...');
console.log('📁 Database path:', dbPath);
console.log('📄 Schema path:', schemaPath);

// Remove existing database
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('🗑️ Removed existing database');
}

// Read enhanced schema
const schema = fs.readFileSync(schemaPath, 'utf8');
const statements = schema.split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

console.log(`📊 Found ${statements.length} SQL statements`);

// Create new database with enhanced schema
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error creating database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to fresh SQLite database');
});

// Execute schema statements
let executed = 0;
let errors = 0;

function executeStatement(index) {
    if (index >= statements.length) {
        console.log(`\n🎉 Database creation completed!`);
        console.log(`✅ Successfully executed: ${executed} statements`);
        if (errors > 0) {
            console.log(`⚠️  Errors: ${errors} statements`);
        }
        
        // Insert default admin user
        const adminPassword = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // password: password
        const adminSalt = 'default_salt_2025';
        
        db.run(`
            INSERT INTO users (username, password_hash, password_salt, role, display_name, email, active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, ['admin', adminPassword, adminSalt, 'administrator', 'System Administrator', 'admin@example.com', true], (err) => {
            if (err) {
                console.log('⚠️ Admin user already exists or error:', err.message);
            } else {
                console.log('👤 Default admin user created (username: admin, password: password)');
            }
            
            db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err.message);
                } else {
                    console.log('🔒 Database connection closed');
                    process.exit(0);
                }
            });
        });
        return;
    }
    
    const statement = statements[index];
    if (statement.length === 0) {
        executeStatement(index + 1);
        return;
    }
    
    db.run(statement, (err) => {
        if (err) {
            console.log(`⚠️  Statement ${index + 1}: ${err.message}`);
            errors++;
        } else {
            console.log(`✅ Statement ${index + 1}: Executed successfully`);
            executed++;
        }
        executeStatement(index + 1);
    });
}

// Start executing statements
executeStatement(0);