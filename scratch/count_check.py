import pymysql
c = pymysql.connect(host='127.0.0.1', user='admin', password='270509',
                    database='proyecto_sigecom', charset='utf8mb4',
                    cursorclass=pymysql.cursors.DictCursor)
cur = c.cursor()
cur.execute('SELECT COUNT(*) as total FROM producto')
print("Total productos en destino:", cur.fetchone()['total'])
cur.execute('SELECT COUNT(*) as total FROM tipo_marca')
print("Total marcas en tipo_marca:", cur.fetchone()['total'])
c.close()
